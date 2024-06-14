const jwt = require("jsonwebtoken")

exports.cookieJwtAuth = (req, res, next) => {

    try {
        const token = req.cookies.token;

        if (!token) {
            // Handle case where token is not present
            return res.status(401).json({message: 'Unauthorized'});
        }

        //validate token
        const user = jwt.verify(token, "BigDog");
        req.user = user;
        next();

    }catch (err){
        //if hte token is invalid or not
        res.clearCookie("token");
        return res.redirect("/login")
    }
};