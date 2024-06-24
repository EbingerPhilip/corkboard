require('dotenv').config();
const axios = require('axios');
const express = require("express");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const OpenAI = require("openai");
const multer = require ('multer');
const handleSocketConnection = require('./socketHandlers');

const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');
const {cookieJwtAuth} = require("./models/cookieJwtAuth");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

handleSocketConnection(io);

app.use(express.json());
app.use(express.static(path.join(__dirname, "client"),{ index : 'login.html' }));
app.use(cookieParser());


const secreteKey = process.env.SECRETE_KEY;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.query.userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

app.use(['/addChat', '/removeChat', '/Message','/Chat', '/ChatIDs'],cookieJwtAuth);

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post('/User', async function (req, res) {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);

    if (!user || user.password !== password) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, Chats: user.Chats }, secreteKey, { expiresIn: "30min" });
    res.cookie("token", token, {
      httpOnly: true,
      // sameSite: 'None',
      // secure: true
    });

    res.status(200).json({ user, token, message: "Login Successful" });
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

  console.log("User: " + JSON.stringify(user));

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


//creates new Chat object
//takes two Userid returns a Chat id
app.post('/addChat', async function (req, res){
  try {
    const { User2 } = req.body;
    const User1 = req.user.id.valueOf();

    console.log(`Creating chat between User1: ${User1} and User2: ${User2}`);

    if (!User2) {
      return res.status(400).send('missing User');
    }

    const chat = new Chat(User1, User2);
    const chatID = await chat.saveChat();

    //update token
    const tokenChats = req.user.Chats
    tokenChats.push(chatID)
    const token = jwt.sign({
      id: req.user.id,
      username: req.user.username,
      Chats: tokenChats
    }, secreteKey, {
      expiresIn: "30min"
    });
    res.cookie("token", token, {
      httpOnly: true,
    });

    console.log(`Chat created successfully with ID: ${chatID}`);
    res.status(201).json({ chatID, message: "Chat created successfully" });

  } catch (err){
    console.error('Error creating Chat:', err);
    res.status(500).send('Internal Server Error');
  }
});


//remove Chat from the Databank
//takes a Chat id sends message
app.delete('/removeChat', async function (req, res){
  try {
    const {ChatID} = req.body;

    //das ging nicht, vermutlich auch wegen cookies??? Philip weißt du da was? ~Julian
    // if (!req.user.Chats.includes(Number(ChatID))){
    //   return res.status(401).send('Invalid Credentials')
    // }

    const chat = await Chat.getChatfromID(ChatID);

    await chat.deleteChat()
    res.status(201).send("Chat deleted")
  } catch (err){
    console.error('Error deleting Chat:', err);
    res.status(500).send('Internal Server Error')
  }
});

//save a Message
//takes a Chat id, User id, Username and Text String
//Username is needed to avoid needlessly searching for a name in db
app.post('/Message', async function (req, res){
  try {
    const { ChatID, TextMessage,} = req.body;
    const userid = req.user.id;
    const username = req.user.username;

    if (!req.user.Chats.includes(Number(ChatID))){
      return res.status(401).send('Invalid Credentials')
    }

    const message = new Message(userid, username, TextMessage)
    const tablename = `Chat${ChatID}`

    const valid = Message.saveMessage(tablename, message)

    if (valid){
      res.status(201).send("Message received")
    } else {
      res.status(400).send('Error in Saving Message')
    }

  } catch (err){
    console.error('Error saving Message:', err);
    res.status(500).send('Internal Server Error')
  }
});

app.get('/Chat', async function (req, res) {
  try {
    const { ChatID } = req.query; // Use req.query to get the query parameters

    if (!ChatID) {
      return res.status(400).send('ChatID is required');
    }
    if (!req.user.Chats.includes(Number(ChatID))){
      return res.status(401).send('Unauthorized');
    }
    const tableName = `Chat${ChatID}`;
    console.log("tablename: " + tableName);

    const chatHistory = await Chat.getMessages(tableName);

    if (chatHistory) {
      res.status(200).json({ chatHistory, message: "Messages retrieved successfully" });
    } else {
      res.status(500).send('Error in retrieving messages');
    }
  } catch (err) {
    console.error('Error retrieving chat messages:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/updateInfo', async function (req, res) {
  try {
    const { userId, email, legalname, phone } = req.body;

    console.log(`Received update request for user: ${userId}`);
    console.log('New details:', { email, legalname, phone });

    const user = await User.findByUserID(userId);
    if (user) {
      user.email = email || null;
      user.legalname = legalname || null;
      user.phone = phone || null;
      console.log('Saving user info for:', userId);
      console.log('Updated details:', { email: user.email, legalname: user.legalname, phone: user.phone });
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

app.post('/uploadProfilePicture', upload.single('profilePicture'), async (req, res) => {
  const userId = req.query.userId;
  const imageUrl = `/uploads/${req.file.filename}`;
  try {
    const user = await User.findByUserID(userId);
    if (user) {
      user.profilePicture = imageUrl;
      await user.saveUserinfo();
      res.status(200).json({ imageUrl });
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
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

app.get('/ChatIDs', async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  try {
    const chats = await User.getChatIDS(userId);
    console.log('User chats:', chats); // Debugging

    if (!chats) {
      return res.status(404).send('User not found or no chats available');
    }

    const chatIDs = JSON.parse(chats);
    const chatDetails = [];

    for (const chatId of chatIDs) {
      const userIds = await Chat.getUserIdsByChatId(chatId);
      console.log(`User IDs for chat ${chatId}:`, userIds); // Debugging

      if (!userIds) continue;

      const user1 = await User.findByUserID(userIds.user1);
      const user2 = await User.findByUserID(userIds.user2);

      chatDetails.push({
        chatId,
        userId1: userIds.user1,
        username1: user1.username,
        userId2: userIds.user2,
        username2: user2.username
      });
    }

    console.log('Chat details:', chatDetails); // Debugging
    res.status(200).json({ chatDetails });
  } catch (error) {
    console.error('Error fetching user or parsing chat IDs:', error);
    res.status(500).send('Error fetching user or parsing chat IDs');
  }
});




server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
