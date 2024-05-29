const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "client")));

let messages = [];

wss.on("connection", (ws) => {

  ws.send(JSON.stringify({ type: "init", messages }));


  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.text) {
      messages.push(parsedMessage);
      broadcastMessage(parsedMessage);
    }
  });
});

function broadcastMessage(message) {
  const data = JSON.stringify({ type: "update", message });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}


server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
