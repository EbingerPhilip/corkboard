const jwt = require("jsonwebtoken")

exports.cookieJwtAuth = (req, res, next) => {

    try {
        const token = req.cookies.token;

        if (!token) {
            // Handle case where token is not present
            return res.status(405).json({message: 'No Cookies'});
        }
        //validate token
        const user = jwt.verify(token, process.env.SECRETE_KEY);

        req.user = user;
        console.log(user)
        next();

    }catch (err){
        //if the token is invalid or not here
        console.log("Cookie Problem " + err)
        res.clearCookie("token");
        return res.status(405).json({message: 'Internal server Error'});
    }
};