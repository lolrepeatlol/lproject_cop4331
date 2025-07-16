require('express');
require('mongodb');
const { ObjectId } = require('mongodb');
const token = require("./createJWT.js");
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.setApp = function (app, client) {
    // Login
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

    // Add Card
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

    // Search Sounds
    app.post('/api/searchSounds', async (req, res) => {
        // incoming: userId, search, jwtToken
        // outgoing: results[{soundName, filePath, ...}], error, jwtToken

        let error = '';
        const { UserID, search, jwtToken } = req.body;

        try {
            if (token.isExpired(jwtToken)) {
                let r = { error: 'The JWT is no longer valid', jwtToken: '' };
                res.status(200).json(r);
                return;
            }
        } catch (e) {
            console.log(e.message);
            let r = { error: e.message, jwtToken: '' };
            res.status(200).json(r);
            return;
        }

        const db = client.db('COP4331');
        const _search = search.trim();

        const results = await db.collection('Sounds').find({
            "soundName": { $regex: _search + '.*', $options: 'i' },
            $or: [
                { "isDefault": "true" },
                { "UserID": UserID }
            ]
        }).toArray();

        let refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch (e) {
            console.log(e.message);
        }

        const ret = { results: results, error: error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    // Register API
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

    // Verify Email
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

            await users.updateOne(
                { _id: user._id },
                {
                    $set: { isVerified: true },
                    $unset: { verificationToken: "" }
                }
            );
            res.status(200).send('Email successfully verified! You can now close this tab and log in.');

        } catch (e) {
            console.error(e);
            res.status(500).send('An error occurred during email verification.');
        }
    });

    // Fogot Password
    app.post('/api/forgotPassword', async (req, res, next) => {
        // incoming: email
        // outgoing: message or error

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email address is required.' });
        }

        try {
            const db = client.db('COP4331');
            const users = db.collection('Users');

            // Find the user by their email address.
            const user = await users.findOne({ email: email });

            if (!user) {
                return res.status(404).json({ error: 'No account with that email address exists.' });
            }

            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

            const expirationTime = new Date(Date.now() + 15 * 60 * 1000);

            await users.updateOne(
                { _id: user._id },
                {
                    $set: {
                        passwordResetCode: resetCode,
                        passwordResetExpires: expirationTime
                    }
                }
            );

            const msg = {
                to: user.email,
                from: 'noreply@em1166.ucfgroup4.xyz',
                subject: 'Your Password Reset Code',
                text: `Your password reset code is ${resetCode}\n\n It will expire in 15 minutes.`,
                html: `
                <p>Your password reset code is:</p>
                <p style="font-size: 26px; font-weight: bold;">${resetCode}</p>
                <p>This code will expire in 15 minutes.</p>`,
            };

            await sgMail.send(msg);
            console.log(`Password reset code sent to ${user.email}`);

            res.status(200).json({ message: 'A password reset code has been sent to your email address.' });

        } catch (err) {
            console.error('Forgot Password API Error:', err);
            if (err.response) {
                console.error(err.response.body)
            }
            res.status(500).json({ error: 'An error occurred while attempting to send the reset code.' });
        }
    });

    // Reset Password
    app.post('/api/resetPassword', async (req, res, next) => {
        // incoming: verification code , email, password
        // outgoing: message or error
        const { email, passwordResetCode, newPassword } = req.body;

        if (!email || !passwordResetCode || !newPassword) {
            return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
        }
        try {
            const db = client.db('COP4331');
            const users = db.collection('Users');
            const user = await users.findOne({
                email: email,
                passwordResetCode: passwordResetCode,
                passwordResetExpires: { $gt: new Date() }
            });
            if (!user) {
                return res.status(404).json({ error: 'Invalid or expired verification code!' });
            }

            await users.updateOne(
                { _id: user._id },
                {
                    $set: {
                        Password: newPassword
                    },
                    $unset: {
                        passwordResetCode: "",
                        passwordResetExpires: ""
                    }
                }
            );

            res.status(200).json({ message: 'Password has been reset!' });

        }
        catch (err) {
            console.error('Reset Password API Error');
            res.status(500).json({ error: 'An error occurred while attempting to send the reset code.' });
        }
    });


    app.get('/', (req, res) => {
        res.send('Server is running. Try POSTing to /api/login or /api/register');
    });
    
    // Save Grid Layout
    app.post('/api/saveGridLayout', async (req, res, next) => {
        const { UserID, layout, jwtToken } = req.body;

        try {
            if (token.isExpired(jwtToken)) {
                return res.status(401).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch (e) {
            return res.status(401).json({ error: 'Invalid JWT', jwtToken: '' });
        }

        if (!UserID || !Array.isArray(layout)) {
            return res.status(400).json({ error: 'UserID and layout array are required.' });
        }

        const updateFields = {};
        layout.forEach((sound, index) => {
            const fieldKey = `${index + 1}`;
            updateFields[fieldKey] = sound ? new ObjectId(sound._id) : null;
        });

        try {
            const db = client.db('COP4331');
            const numericUserId = parseInt(UserID, 10);

            if (isNaN(numericUserId)) {
                return res.status(400).json({ error: 'Invalid UserID format.' });
            }

            await db.collection('UserLayout').updateOne(
                { UserID: numericUserId },
                { $set: { ...updateFields, UserID: numericUserId } },
                { upsert: true }
            );

            const refreshedToken = token.refresh(jwtToken);
            res.status(200).json({ message: 'Layout saved successfully.', jwtToken: refreshedToken });

        } catch (e) {
            console.error('API Error:', e);
            res.status(500).json({ error: 'Server error while saving layout.' });
        }
    });


    app.post('/api/getGridLayout', async (req, res, next) => {
        const { UserID, jwtToken } = req.body;


        try {
            if (token.isExpired(jwtToken)) {
                return res.status(401).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch (e) {
            return res.status(401).json({ error: 'Invalid JWT', jwtToken: '' });
        }


        if (!UserID) {
            return res.status(400).json({ error: 'UserID is required.' });
        }


        try {
            const db = client.db('COP4331');
            const refreshedToken = token.refresh(jwtToken);
            const numericUserId = parseInt(UserID, 10);

            if (isNaN(numericUserId)) {
                return res.status(400).json({ error: 'Invalid UserID format.' });
            }

            const layoutDoc = await db.collection('UserLayout').findOne({ UserID: numericUserId });

            if (!layoutDoc) {
                return res.status(200).json({ layout: Array(8).fill(null), jwtToken: refreshedToken });
            }


            const soundIdsInLayout = [];
            for (let i = 0; i < 8; i++) {
                const fieldKey = `${i + 1}`;
                const soundId = layoutDoc[fieldKey];
                if (soundId && soundId instanceof ObjectId) {
                    soundIdsInLayout.push(soundId);
                }
            }

            const sounds = await db.collection('Sounds').find({ _id: { $in: soundIdsInLayout } }).toArray();
            const soundMap = new Map(sounds.map(sound => [sound._id.toString(), sound]));

            const finalLayout = [];
            for (let i = 0; i < 8; i++) {
                const fieldKey = `${i + 1}`;
                const soundId = layoutDoc[fieldKey];
                const soundDetails = soundId ? soundMap.get(soundId.toString()) : null;
                finalLayout.push(soundDetails || null);
            }

            res.status(200).json({ layout: finalLayout, jwtToken: refreshedToken });

        } catch (e) {
            console.error('API Error:', e);
            res.status(500).json({ error: 'Server error while retrieving layout.' });
        }
    });

    app.get('/', (req, res) => {
        res.send('Server is running. Try POSTing to /api/login or /api/register');
    });

}
