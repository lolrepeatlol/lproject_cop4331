require('express');
require('mongodb');
const token = require("./createJWT.js");
const sgMail = require('@sendgrid/mail');

// It's crucial to set your SendGrid API key. 
// For security, use an environment variable instead of hardcoding it.
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.setApp = function (app, client) {

    app.post('/api/login', async (req, res, next) => {
        // incoming: login, password
        // outgoing: id, firstName, lastName, error

        const { login, password } = req.body;
        let ret;

        try {
            const db = client.db('COP4331');
            const results = await db.collection('Users').find({ Login: login, Password: password }).toArray();
            if (results.length > 0) {
                const user = results[0];

                // Check if the UserID field actually exists and user has verified their email  
                if (user.UserID !== undefined && user.UserID !== null) {

                    if (user.isVerified === true) {
                        const id = user.UserID;
                        const fn = user.FirstName;
                        const ln = user.LastName;
                        ret = token.createToken(fn, ln, id);
                    }
                    else {
                        console.error("Email not verified!");
                        ret = { error: "Account not verified. Please check your email." };
                        return res.status(403).json(ret);
                    }

                } else {
                    // This will be triggered if the UserID field is missing or has the wrong case.
                    console.error("Error: User found but UserID field is missing or null.", user);
                    ret = { error: "Login failed: User data is corrupted or malformed." };
                    // It's better to send a 500 status for actual server-side errors.
                    return res.status(500).json(ret);
                }
            } else {
                // Send a more appropriate 401 Unauthorized status for incorrect credentials.
                ret = { error: "Login/Password incorrect" };
                return res.status(401).json(ret);
            }

        } catch (e) {
            console.error(e);
            ret = { error: e.message };
            return res.status(500).json(ret);
        }

        res.status(200).json(ret);
    });


    app.post('/api/addcard', async (req, res, next) => {
        // incoming: userId, card, jwtToken
        // outgoing: error, jwtToken

        const { UserID, card, jwtToken } = req.body;

        try {
            if (token.isExpired(jwtToken)) {
                var r = { error: 'The JWT is no longer valid', jwtToken: '' };
                res.status(200).json(r);
                return;
            }
        } catch (e) {
            console.log(e.message);
            var r = { error: e.message, jwtToken: '' };
            res.status(200).json(r);
            return;
        }

        const newCard = { Card: card, UserID: UserID };
        var error = '';
        try {
            const db = client.db('COP4331');
            const result = await db.collection('Cards').insertOne(newCard);
        } catch (e) {
            error = e.toString();
        }

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch (e) {
            console.log(e.message);
        }

        var ret = { error: error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    app.post('/api/searchcards', async (req, res, next) => {
        // incoming: userId, search, jwtToken
        // outgoing: results[], error, jwtToken

        var error = '';
        const { UserID, search, jwtToken } = req.body;

        try {
            if (token.isExpired(jwtToken)) {
                var r = { error: 'The JWT is no longer valid', jwtToken: '' };
                res.status(200).json(r);
                return;
            }
        } catch (e) {
            console.log(e.message);
            var r = { error: e.message, jwtToken: '' };
            res.status(200).json(r);
            return;
        }

        var _search = search.trim();
        const db = client.db('COP4331');
        const results = await db.collection('Cards').find({ "Card": { $regex: _search + '.*', $options: 'i' }, "UserID": UserID }).toArray();

        var _ret = [];
        for (var i = 0; i < results.length; i++) {
            _ret.push(results[i].Card);
        }

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch (e) {
            console.log(e.message);
        }

        var ret = { results: _ret, error: error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    app.post('/api/register', async (req, res, next) => {
        // incoming: firstName, lastName, login, password, email
        // outgoing: error

        // Note: isVerified is set internally, not by the user.
        const { firstName, lastName, login, password, email } = req.body;
        const db = client.db('COP4331');
        const users = db.collection('Users');
        let error = '';

        try {
            const existingUser = await users.findOne({ Login: login });
            if (existingUser) {
                error = 'User with this login already exists.';
                return res.status(409).json({ error: error });
            }

            const existingEmail = await users.findOne({ email: email });
            if (existingEmail) {
                error = 'An account with this email already exists.';
                return res.status(409).json({ error: error });
            }


            const lastUser = await users.find().sort({ UserID: -1 }).limit(1).toArray();
            const newUserID = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

            // Create a unique token for email verification
            const verificationToken = require('crypto').randomBytes(32).toString('hex');

            const newUser = {
                UserID: newUserID,
                FirstName: firstName,
                LastName: lastName,
                Login: login,
                Password: password,
                email: email,
                isVerified: false,
                verificationToken: verificationToken
            };
            await users.insertOne(newUser);

            // --- Send Verification Email ---
            const fromEmail = 'noreply@em1166.ucfgroup4.xyz';
            const protocol = req.protocol;
            const host = req.get('host');
            const verificationLink = `${protocol}://${host}/api/verify-email?token=${verificationToken}&email=${email}`;

            const msg = {
                to: email,
                from: fromEmail,
                subject: 'Welcome! Please Verify Your Email',
                text: `Thank you for registering. Please click this link to verify your email: ${verificationLink}`,
                html: `<strong>Thank you for registering!</strong><p>Please click the link below to verify your email address:</p><a href="${verificationLink}">Verify Email</a>`,
            };

            await sgMail.send(msg);
            console.log(`Verification email sent to ${email}`);
            // --- End of Email Sending ---

            // Do not send a JWT token on register. The user must log in after verifying.
            res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });

        } catch (err) {
            console.error(err);
            // Check if it's a SendGrid error
            if (err.response) {
                console.error(err.response.body)
            }
            res.status(500).json({ error: 'Server error during registration.' });
        }
    });

    /**
     * API Endpoint to verify a user's email address.
     */
    app.get('/api/verify-email', async (req, res) => {
        const { token, email } = req.query;

        if (!token || !email) {
            return res.status(400).send('Verification failed. Token or email not provided.');
        }

        try {
            const db = client.db('COP4331');
            const users = db.collection('Users');

            const user = await users.findOne({ email: email, verificationToken: token });

            if (!user) {
                return res.status(400).send('Invalid verification link. Please try registering again.');
            }

            if (user.isVerified) {
                return res.status(200).send('This account has already been verified. You can now log in.');
            }

            // Update the user to set isVerified to true and remove the token
            await users.updateOne(
                { _id: user._id },
                {
                    $set: { isVerified: true },
                    $unset: { verificationToken: "" } // Remove the token after successful verification
                }
            );
            res.status(200).send('Email successfully verified! You can now close this tab and log in.');

        } catch (e) {
            console.error(e);
            res.status(500).send('An error occurred during email verification.');
        }
    });


    app.get('/', (req, res) => {
        res.send('Server is running. Try POSTing to /api/login or /api/register');
    });
}
