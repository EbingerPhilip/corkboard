const express = require("express");
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'client')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(3000, () => {
    console.log("Server läuft unter http://localhost:3000");
});
