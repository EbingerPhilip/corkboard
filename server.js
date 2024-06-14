const axios = require('axios');
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken")
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const OpenAI = require("openai");

const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');
const {cookieJwtAuth} = require("./models/cookieJwtAuth");



const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "client"), { index : 'login.html' }));
app.use(cookieParser());
app.use(['/addChat', '/removeChat', '/Message','/Chat'],cookieJwtAuth);

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const API_KEY = 'u3O0f9JEeVZmSd61OPE6jQ==RH3eJvBNB0kYkB9n';
const secreteKey = "BigDog"

const openai = new OpenAI({
  apiKey: 'sk-proj-PrZCM8dxe4eVG2Ep5aX7T3BlbkFJsXlDN6wVxvvDM5bt2fiv'
});

let clients = {};
const groups = {
  1: ['2', '3', '4'],
};

io.on('connection', (socket) => {
  socket.on('init', (userId) => {
    clients[userId] = socket;
    socket.userId = userId;
    socket.emit('init', { messages: [] });

    // Join user to their groups
    for (const groupId in groups) {
      if (groups[groupId].includes(userId)) {
        socket.join(`group-${groupId}`);
      }
    }

    console.log(`User ${userId} connected`);
  });

  socket.on('group', (data) => {
    if (typeof data === 'object' && data.groupId && data.text) {
      if (groups[data.groupId] && groups[data.groupId].includes(socket.userId)) {
        console.log(`Sending group message from ${socket.userId} to group ${data.groupId}: ${data.text}`);
        socket.broadcast.to(`group-${data.groupId}`).emit('group', {
          fromUserId: socket.userId,
          groupId: data.groupId,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        });
      } else {
        console.log(`User ${socket.userId} is not authorized to send messages to group ${data.groupId}`);
      }
    } else {
      console.warn('Received invalid data format for group event:', data);
    }
  });

  socket.on('direct', (data) => {
    if (typeof data === 'object' && data.toUserId && data.text) {
      const targetSocket = clients[data.toUserId];
      if (targetSocket) {
        targetSocket.emit('direct', {
          fromUserId: socket.userId,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }
    } else {
      console.warn('Received invalid data format for direct event:', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected`);
      delete clients[socket.userId];
    }
  });
});


//login
//client sends username and password, server checks for a corresponding User and either sends it or error back.
app.post('/User', async function (req, res) {
try {
  console.log("request arived")
  const {username, password} = req.body;
  const user = await User.findByUsername(username)

  if (user.password !== password ) {
    res.status(403).message("Bad password")
  }
  delete user.password;
  const userPayload = {...user}

  const token = jwt.sign(userPayload, secreteKey, {expiresIn: "30min"})
  res.cookie("token", token, {
    httpOnly: true,
  });

  res.status(200).json({ user, message: "Login Successful" });

}catch (err){ console.log(err)}
})

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: message }],
            max_tokens: 2048,
            temperature: 1,
        });

        console.log('OpenAI response:', response);

        if (response && response.choices && response.choices.length > 0) {
            res.json({ response: response.choices[0].message.content });
        } else {
            throw new Error('No response choices available');
        }
    } catch (error) {
        console.error('Error handling chat request:', error.message);
        res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
    }
});

//adds a new User to our Database
//takes username and password
app.post('/newUser', async function (req, res) {
  try {
    const { username, password } = req.body;

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

app.put('/updateInfo', async function (req, res) {
    try {
        const { username, email, name, phone } = req.body;

        const user = await User.findByUsername(username);
        if (user) {
            user.email = email;
            user.name = name;
            user.phone = phone;
            await user.saveUserinfo();
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
  const {User2} = req.body;
  const User1 = req.user.id.valueOf()

  if (!User2) {
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
    if (!req.user.Chats.includes(Number(ChatID))){
      return res.status(401).send('Invalid Credentials')
    }

    const chat = await Chat.getChatfromID(ChatID);

    await chat.deleteChat()
    res.status(201).send("Chat deleted")
  } catch (err){
    console.error('Error deleting Chat:', err);
    res.status(400).send('Internal Server Error')
  }
});

//save a Message
//takes a Chat id, User id, Username and Text String
//Username is needed to avoid needlessly searching for a name in db
app.post('/Message', async function (req, res){
  try {
    const {ChatID, TextMessage} = req.body;

    if (!req.user.Chats.includes(Number(ChatID))){
      return res.status(401).send('Invalid Credentials')
    }

    const message = new Message(req.user.id, req.user.username, TextMessage)
    const tablename = `Chat${ChatID}`

    const valid = Message.saveMessage(tablename, message)

    if (valid){
      res.status(201).send("Message received")
    } else {
      res.status(500).send('Error in Saving Message')
    }

  } catch (err){
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
  } catch (err){
    res.status(500).send('Internal Server Error')
  }
});

app.get('/emoji', async (req, res) => {
  try {
    // Liste der Kategorien von Emojis
    const categories = ['face', 'hand', 'animal', 'food', 'activity', 'symbol', 'heart'];

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

app.get('/findUser', async function (req, res){
  const {UserId} = req.body;
  const user = await User.findByUserID(UserId);

  if (!user) {
    res.status(400).send("no user found")
  }else{
    res.status(200).json(user)
  }
})

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
