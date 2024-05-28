const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the "client" directory
app.use(express.static(path.join(__dirname, "client")));

// Array to store messages
let messages = [];

// WebSocket connection handler
wss.on("connection", (ws) => {
  // Send existing messages to the new client
  ws.send(JSON.stringify({ type: "init", messages }));

  // Handle incoming messages
  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.text) {
      messages.push(parsedMessage);
      // Broadcast the new message to all clients
      broadcastMessage(parsedMessage);
    }
  });
});

// Function to broadcast a message to all connected clients
function broadcastMessage(message) {
  const data = JSON.stringify({ type: "update", message });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start the server
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
