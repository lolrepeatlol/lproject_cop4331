require('express');
require('mongodb');

var token = require('./createJWT.js'); 

exports.setApp = function(app, client)
{

    app.post('/api/login', async (req, res, next) =>
    {
        // incoming: login, password
        // outgoing: id, firstName, lastName, error

        var error = '';

        const { login, password } = req.body;

        const db = client.db('COP4331');
        const results = await db.collection('Users').find({Login:login,Password:password}).toArray();

        var id = -1;
        var fn = '';
        var ln = ''; 

        var ret;

        if( results.length > 0 )
        {
            id = results[0].UserID;
            fn = results[0].FirstName;
            ln = results[0].LastName;

            try 
            { 
                const token = require("./createJWT.js"); 
                ret = token.createToken( fn, ln, id ); 
            } 
            catch(e) 
            { 
                ret = {error:e.message}; 
            }
        }
        else {
            ret = {error:"Invalid username/password combination"};
        }

        res.status(200).json(ret);
    });

    app.post('/api/register', async(req, res, next) =>
        {
        // incoming: firstName, lastName, login, password
        // outgoing: id, firstName, lastName, error

        const { firstName, lastName, login, password } = req.body;

        const db = client.db('COP4331');
        const users = db.collection('Users');

        let error = '';

        try {
            // Check if user already exists
            const existingUser = await users.findOne({ Login: login });
            if (existingUser) {
                error = 'User already exists';
                return res.status(400).json({ id: -1, firstName: '', lastName: '', error });
            }

            // Generate a new unique UserID (you could also use MongoDB's _id if you prefer)
            const lastUser = await users.find().sort({ UserID: -1 }).limit(1).toArray();
            const newUserId = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

            // Insert new user
            const newUser = {
                UserID: newUserId,
                FirstName: firstName,
                LastName: lastName,
                Login: login,
                Password: password  // Hash this later?
            };

            await users.insertOne(newUser);

            const ret = {
                id: newUserId,
                firstName,
                lastName,
                error: ''
            };

            res.status(200).json(ret);
        } catch (err) {
            console.error(err);
            res.status(500).json({ id: -1, firstName: '', lastName: '', error: 'Server error' });
        }
    });

    app.post('/api/addcard', async (req, res, next) =>
    {
        // incoming: userId, color
        // outgoing: error

        const { userId, card, jwtToken } = req.body;

        try
        {
            if( token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken: ''}; 

                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
        }

        const newCard = {Card:card,UserId:userId};
        var error = '';

        try
        {
            const db = client.db('COP4331');
            const result = db.collection('Cards').insertOne(newCard);
        }
        catch(e)
        {
            error = e.toString();
        }

        var refreshedToken = null;
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }
        
        var ret = { error: error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    app.post('/api/searchcards', async (req, res, next) =>
        {
        // incoming: userId, search
        // outgoing: results[], error 

        var error = '';

        const { userId, search, jwtToken } = req.body;

        try
        {
            if( token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken: ''}; 

                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
        }
        
        var _search = search.trim(); // toLowerCase()??

        const db = client.db('COP4331');
        const results = await db.collection('Cards').find({"Card":{$regex:_search+'.*', $options:'i'}}).toArray();

        var _ret = [];
        for( var i=0; i<results.length; i++ )
        {
            _ret.push( results[i].Card );
        }

        var refreshedToken = null; 
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }

        var ret = { results:_ret, error: error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });
}