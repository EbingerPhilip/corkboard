require('dotenv').config();
const axios = require('axios');
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
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
app.use(express.static(path.join(__dirname, "client"),{ index : 'login.html' }));
app.use(cookieParser());

//braucht das wer? hab ich beim mergen ned gecheckt
app.use(['/addChat', '/removeChat', '/Message','/Chat'],cookieJwtAuth);

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const secreteKey = "BigDog";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

  socket.on('direct', async (data) => {
    if (typeof data === 'object' && data.toUserId && data.text) {
      if (data.toUserId === socket.userId) {
        console.warn('Cannot create chat with self');
        return;
      }

      const targetSocket = clients[data.toUserId];

      // Benutzername des Absenders abrufen
      const senderResponse = await axios.get(`http://localhost:3000/findUser?UserId=${socket.userId}`);
      const senderUsername = senderResponse.data.username;

      if (targetSocket) {
        targetSocket.emit('direct', {
          fromUserId: socket.userId,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        });
        io.to(targetSocket.id).emit('create-chat', {
          chatName: senderUsername,
          userId: socket.userId
        });
      } else {
        console.log('Empfänger ist offline, Nachricht wird gespeichert.');
        // Nachricht in der DB speichern (Platzhalter)
        // saveChatToDatabase(socket.userId, data.toUserId, data.text, data.timestamp);
      }
    } else {
      console.warn('Received invalid data format for direct event:', data);
    }
  });

  socket.on('create-chat', async (data) => {
    if (typeof data === 'object' && data.userIdToAdd && data.chatUsername) {
      if (data.userIdToAdd === socket.userId) {
        console.warn('Cannot create chat with self');
        return;
      }

      const targetSocket = clients[data.userIdToAdd];
      if (targetSocket) {
        console.log(`Erstelle Chat für User ${data.userIdToAdd} mit Chatname ${data.chatUsername}`);
        targetSocket.emit('create-chat', {
          chatName: data.chatUsername,
          userId: data.userIdToAdd
        });
      } else {
        console.log('Empfänger ist offline, Chat wird in der DB gespeichert.');
        // Chat in der DB speichern (Platzhalter)
      }
    } else {
      console.warn('Received invalid data format for create-chat event:', data);
    }
  });


  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected`);
      delete clients[socket.userId];
    }
  });
});

app.get('/findUser', async function (req, res) {
  const userId = req.query.UserId;
  const user = await User.findByUserID(userId); // Benutzer aus der Datenbank abrufen

  console.log("User: " + user);

  if (!user) {
    res.status(400).send("no user found");
  } else {
    res.status(200).json(user);
  }
});

// Endpoints beibehalten, aber nicht verwendet
app.post('/User', async function (req, res) {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username); 

    if (!user || user.password !== password) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, secreteKey, { expiresIn: "30min" });
    res.cookie("token", token, {
      httpOnly: true,
    });

    res.status(200).json({ user: { id: user.id, username: user.username }, token, message: "Login Successful" });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

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


app.get('/findUser', async function (req, res){
  const userId = req.query.UserId;
  const user = await User.findByUserID(userId);
  // const {userId} = req.body;
  // const user = await User.findByUserID(userId);

  console.log("User: " + user)

  if (!user) {
    res.status(400).send("no user found")
  }else{
    res.status(200).json(user)
  }
})

app.post('/newUser', async function (req, res) {
  try {
    const { username, password } = req.body;

    //console.log("cheese on server: " + username)

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    if (await User.checkForUsername(username)){
      return res.status(409).send('Username already in Use')
    }

    const user = new User(username, password,);
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
        headers: { 'X-Api-Key': process.env.API_EMOJI_KEY }
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
