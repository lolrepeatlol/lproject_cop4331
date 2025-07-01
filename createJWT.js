const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.createToken = function ( fn, ln, id )
{
    return _createToken( fn, ln, id );
}

_createToken = function ( fn, ln, id )
{
    try
    {
      // This user object will be the payload of the JWT.
      const user = {UserID:id,firstName:fn,lastName:ln};

      // The 'iat' (issued at) field is created automatically by jwt.sign.
      const accessToken =  jwt.sign( user, process.env.ACCESS_TOKEN_SECRET);

      var ret = {accessToken:accessToken};
    }
    catch(e)
    {
      var ret = {error:e.message};
    }
    return ret;
}

exports.isExpired = function( token )
{
   var isError = jwt.verify( token, process.env.ACCESS_TOKEN_SECRET, 
     (err, verifiedJwt) =>
   {
     if( err )
     {
       return true;
     }
     else
     {
       return false;
     }
   });

   return isError;
}

exports.refresh = function( token )
{
  var ud = jwt.decode(token,{complete:true});

  // CORRECTED: The payload field is 'userId' (camelCase), not 'id'.
  // This was a bug that would cause refreshed tokens to lose the user's ID.
  var UserID = ud.payload.UserID;
  var firstName = ud.payload.firstName;
  var lastName = ud.payload.lastName;

  return _createToken( firstName, lastName, UserID );
}
