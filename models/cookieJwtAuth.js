const jwt = require("jsonwebtoken")

exports.cookieJwtAuth = (req, res, next) => {

    try {
        const token = req.cookies.token;

        if (!token) {
            // Handle case where token is not present
            return res.status(401).json({message: 'Unauthorized'});
        }

        //validate token
        const user = jwt.verify(token, process.env.SECRETE_KEY);
        req.user = user;
        console.log(user)
        next();

    }catch (err){
        //if hte token is invalid or not
        console.log("Cookie Problem" + err)
        res.clearCookie("token");
        return res.redirect("/login")
    }
};