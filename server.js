require('dotenv').config();
const axios = require('axios');
const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require('socket.io');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const OpenAI = require("openai");


const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

//app.get('/', (req, res) => {
//res.sendFile(path.join(__dirname, 'client', 'login.html'));
//});

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const API_KEY = 'u3O0f9JEeVZmSd61OPE6jQ==RH3eJvBNB0kYkB9n';

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
      try {
        const targetSocket = clients[data.toUserId];

        // Benutzername des Absenders abrufen
        const senderResponse = await axios.get(`http://localhost:3000/findUser?UserId=${socket.userId}`);
        const senderUsername = senderResponse.data.username;

        // Benutzername des Empfängers abrufen
        const receiverResponse = await axios.get(`http://localhost:3000/findUser?UserId=${data.toUserId}`);
        const receiverUsername = receiverResponse.data.username;

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
          console.log('Empfänger ist offline, Nachricht und Chat werden in der DB gespeichert.');
          // Markiert für DB-Anbindung: Chat und Nachricht in der DB speichern
          // Beispiel-Platzhalter:
          // saveChatToDatabase(socket.userId, data.toUserId, data.text, data.timestamp);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen des Benutzernamens:', error);
      }
    } else {
      console.warn('Received invalid data format for direct event:', data);
    }
  });

  socket.on('create-chat', (data) => {
    if (typeof data === 'object' && data.chatName && data.userId) {
      const targetSocket = clients[data.userId];
      if (targetSocket) {
        console.log(`Erstelle Chat für User ${data.userId} mit Chatname ${data.chatName}`);
        targetSocket.emit('create-chat', {
          chatName: data.chatName,
          userId: data.userId
        });
      } else {
        console.log('Empfänger ist offline, Chat wird in der DB gespeichert.');
        // Markiert für DB-Anbindung: Chat in der DB speichern
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



app.get('/User', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    const valid = user.checkPassword(password);

    if (valid) {
      res.status(200).json({ user, message: "Login Successful" });
    } else {
      res.status(400).json({ message: "Login failed" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
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

app.post('/addChat', async function (req, res){
  try {
    const {User1, User2} = req.body;

    if (!User1 || !User2) {
      return res.status(400).send('missing User');
    }

    const chat = new Chat(User1,User2);
    const chatID = await chat.saveChat();
    res.status(201).json({chatID, message: "Chat created successfully"})

  } catch (err){
    console.error('Error creating Chat:', err);
    res.status(500).send('Internal Server Error')
  }
});

app.delete('/removeChat', async function (req, res){
  try {
    const {ChatID} = req.body;
    const chat = await Chat.getChatfromID(ChatID);

    await chat.deleteChat()
    res.status(201).send("Chat deleted")
  } catch (err){
    console.error('Error deleting Chat:', err);
    res.status(500).send('Internal Server Error')
  }
});

app.post('/Message', async function (req, res){
  try {
    const {ChatID, UserID, Username, TextMessage} = req.body;
    const message = new Message(UserID, Username, TextMessage)
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

app.get('/Chat', async function (req, res){
  try {
    const {ChatID} = req.body;
    const tablename = `Chat${ChatID}`
    const chatHistory = await Chat.getMessages(tablename);

    if (chatHistory){
      res.status(201).json({chatHistory, message : "Message received"});
    } else {
      res.status(500).send('Error in retrieving Messages');
    }
  } catch (err){
    res.status(500).send('Internal Server Error')
  }
});

app.get('/emoji', async (req, res) => {
  try {
    const categories = ['face', 'hand', 'animal', 'food', 'activity', 'symbol', 'heart'];

    const fetchEmojis = async (category) => {
      const response = await axios.get(`https://api.api-ninjas.com/v1/emoji?name=${category}`, {
        headers: { 'X-Api-Key': API_KEY }
      });
      return response.data;
    };

    const emojiResults = await Promise.all(categories.map(fetchEmojis));
    const allEmojis = emojiResults.flat();

    res.json(allEmojis);

  } catch (error) {
    console.error('Error fetching emojis:', error);
    res.status(500).send('Error fetching emojis');
  }
});


server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
