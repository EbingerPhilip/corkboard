const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require('body-parser');

const User = require('./models/users');
const Chat = require('./models/chats');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "client")));

app.use(bodyParser.json());

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


//client sends username and password, server checks for a corresponding User and either sends it or error back.
app.get('/User', async function (req, res) {
try {
  const {username, password} = req.body;
  const user = await User.findByUsername(username)
  const valid = user.checkpassword(password);


  if (valid){
    res.status(200).json({ user, message: "Login Successful" });
  }else{
    res.status(400).message("Login failed")
  }
}catch (err){ console.log(err)}
})

//adds a new User to our Database
app.post('/newUser', async function (req, res) {
  try {
    const {username, password} = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    const user = new User(username, password);
    await user.saveUser();
    res.status(201).send('User created successfully')

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send('Internal Server Error')
  }
});

//creates new Chat object
app.post('/addChat', async function (req, res){
try {
  const {User1, User2} = req.body;

  if (!User1 || !User2) {
    return res.status(400).send('missing User');
  }

  const chat = new Chat(User1,User2);
  const chatID = await chat.saveChat();
  res.status(201).json({chatID, message: "Chat created successfully"})

}catch (err){
  console.error('Error creating Chat:', error);
  res.status(500).send('Internal Server Error')
}
});

//remove Chat from Databanks
app.delete('/removeChat', async function (req, res){
  try {
    const {ChatID} = req.body;
    const chat = await Chat.getChatfromID(ChatID);



  }catch (err){
    console.error('Error deleting Chat:', err);
    res.status(500).send('Internal Server Error')
  }
});






server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
