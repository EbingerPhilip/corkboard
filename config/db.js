require("dotenv").config();
const mysql = require('mysql2')

const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    database:'users-cb',
    password:'#corkboard',
})

//test Code please ignore
let sql = "SELECT * FROM users"

pool.execute(sql, function (err, result){
   if (err) throw err;

   console.log(result)

});





module.exports = pool.promise();
