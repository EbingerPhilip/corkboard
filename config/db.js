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
console.log(process.env.DBuser + " : " + process.env.DBpassword);


const pool = mysql.createPool({
    host: '172.205.225.192' ,
    user: process.env.DBuser,
    password:process.env.DBpassword,
    database:'users_cb',  
    
})

module.exports = pool.promise();
