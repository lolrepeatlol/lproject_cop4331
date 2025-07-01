require('express');
require('mongodb');
// Move this require to the top for better code structure.
const token = require("./createJWT.js");

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

                // Check if the UserID field actually exists before trying to use it.
                if (user.UserID !== undefined && user.UserID !== null) {
                    const id = user.UserID;
                    const fn = user.FirstName;
                    const ln = user.LastName;
                    
                    ret = token.createToken(fn, ln, id);
                } else {
                    // This will be triggered if the UserID field is missing or has the wrong case.
                    console.error("Error: User found but UserID field is missing or null.", user);
                    ret = { error: "Login failed: User data is corrupted or malformed." };
                    // It's better to send a 400 or 500 status for actual errors.
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
        // incoming: firstName, lastName, login, password
        // outgoing: error, token

        const { firstName, lastName, login, password } = req.body;
        const db = client.db('COP4331');
        const users = db.collection('Users');
        let error = '';
        var ret;

        try {
            const existingUser = await users.findOne({ Login: login });
            if (existingUser) {
                error = 'User already exists';
                return res.status(400).json({ error: error });
            }

            const lastUser = await users.find().sort({ UserID: -1 }).limit(1).toArray();
            const newUserID = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

            const newUser = {
                UserID: newUserID,
                FirstName: firstName,
                LastName: lastName,
                Login: login,
                Password: password 
            };
            await users.insertOne(newUser);

            // Create a JWT for the new user
            try {
                ret = token.createToken(firstName, lastName, newUserID);
            } catch (e) {
                ret = { error: e.message };
            }

            res.status(200).json(ret);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    app.get('/', (req, res) => {
        res.send('Server is running. Try POSTing to /api/login or /api/register');
    });
}
