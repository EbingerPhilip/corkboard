const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require('body-parser');

const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');



const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

let clients = {};
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === "init" && parsedMessage.userId) {
      clients[parsedMessage.userId] = ws;
      ws.userId = parsedMessage.userId;
      ws.send(JSON.stringify({ type: "init", messages: [] }));
    }

    if (parsedMessage.type === "direct" && parsedMessage.toUserId && parsedMessage.text) {
      const targetWs = clients[parsedMessage.toUserId];
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
          type: "direct",
          fromUserId: ws.userId,
          text: parsedMessage.text,
          timestamp: parsedMessage.timestamp
        }));
      }
      ws.send(JSON.stringify({
        type: "direct",
        fromUserId: ws.userId,
        text: parsedMessage.text,
        timestamp: parsedMessage.timestamp
      }));
    }
  });

  ws.on("close", () => {
    if (ws.userId) {
      delete clients[ws.userId];
    }
  });
});


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
  console.error('Error creating Chat:', err);
  res.status(500).send('Internal Server Error')
}
});

//remove Chat from the Databank
app.delete('/removeChat', async function (req, res){
  try {
    const {ChatID} = req.body;
    const chat = await Chat.getChatfromID(ChatID);

    await chat.deleteChat()
    res.status(201).send("Chat deleted")
  }catch (err){
    console.error('Error deleting Chat:', err);
    res.status(500).send('Internal Server Error')
  }
});

//save a Message
app.post('/Message', async function (req, res){
  try {
    const {ChatID, UserID, Username, TextMessage} = req.body;
    const message = new Message(UserID, Username, TextMessage)
    const tablename = `Chat${ChatID}`

    const valid = Message.saveMessage(tablename, message)

    if (valid){
      res.status(201).send("Message received")
    }else{
      res.status(500).send('Error in Saving Message')
    }

  }catch (err){
    console.error('Error saving Message:', err);
    res.status(500).send('Internal Server Error')
  }
});

//return a Chat
app.get('/Chat', async function (req, res){
  try {
    const {ChatID} = req.body;
    const tablename = `Chat${ChatID}`
    const chatHistory = await Chat.getMessages(tablename);

    if (chatHistory){
      res.status(201).json({chatHistory,message : "Message received"});
    }else{
      res.status(500).send('Error in retrieving Messages');
    }
  }catch (err){
    res.status(500).send('Internal Server Error')
  }
});



server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
