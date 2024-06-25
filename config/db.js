require("dotenv").config();
const mysql = require('mysql2')

const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    database:'users-cb',
    password:'#corkboard',
})

module.exports = pool.promise();
