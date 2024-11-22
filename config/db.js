require("dotenv").config();
const mysql = require('mysql2')


/* //localhost connection
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'#corkboard',
    database:'users-cb',  
    
})*/


//server connection 



const pool = mysql.createPool({
    host: 'localhost' ,
    user: process.env.DBuser,
    password:process.env.DBpassword,
    database:'users_cb',  
    
})

module.exports = pool.promise();
