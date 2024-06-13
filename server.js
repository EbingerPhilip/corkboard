const axios = require('axios'); //JS Library; verwendet Promises
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require('body-parser');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs"); // Installiere mit: npm install yamljs

const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');



const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


app.use(express.json());

//app.get('/', (req, res) => {
  //res.sendFile(path.join(__dirname, 'client', 'login.html'));
//});

app.use(express.static(path.join(__dirname, "client")));
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const API_KEY = 'u3O0f9JEeVZmSd61OPE6jQ==RH3eJvBNB0kYkB9n';

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

//login
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
//takes username and password
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

//handles updates to the user profile information
app.put('/updateInfo', async function (req, res) {
  try {
    const { username, email, name, phone } = req.body;

    const user = await User.findByUsername(username);  //findet User
    //updated User info
    if (user) {
      user.email = email;
      user.name = name;
      user.phone = phone;
      await user.saveUserinfo();   //calls 'saveUserInfo um update Info in DB zu speichern
      res.status(201).send('Userinfo saved successfully');
    } else {
      res.status(400).send('User not found');
    }
  } catch (error) {
    console.error('Error saving user info:', error);
    res.status(500).send('Internal Server Error');
  }
});

//creates new Chat object
//takes two Userid returns a Chat id
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
//takes a Chat id sends message
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
//takes a Chat id, User id, Username and Text String
//Username is needed to avoid needlessly searching for a name in db
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
//takes a Chat id, returns a List of Message objects
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

app.get('/emoji', async (req, res) => {
  try {
    // Liste der Kategorien von Emojis
    const categories = ['face', 'hand', 'animal', 'food', 'activity', 'symbol', 'heart'];

    //Funktion um die Emojis für eine bestimmte Kategorie zu holen
    //Nimmt eine Kategorie und macht eine GET Anfrage an Emoji-API
    const fetchEmojis = async (category) => {
      const response = await axios.get(`https://api.api-ninjas.com/v1/emoji?name=${category}`, {
        headers: { 'X-Api-Key': API_KEY }
      });
      return response.data;
    };

    // Erstellt Array von Promises, indem für jede Kategorie 'fetchEmojis' aufgerufen wird
    //Wartet bis alle Promises abgeschlossen sind und gibt Ergebnisse als Array zurück
    const emojiResults = await Promise.all(categories.map(fetchEmojis));

    // Flacht das Array von Arrays in ein einzelnes Array ab
    const allEmojis = emojiResults.flat();

    // Sendet gesammelte Emojis als JSON Response zurück
    res.json(allEmojis);

  } catch (error) {
    console.error('Error fetching emojis:', error);
    res.status(500).send('Error fetching emojis');
  }
});



server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
