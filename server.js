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
// const handleSocketConnection = require('./socketHandlers');
const { handleSocketConnection, clients } = require('./socketHandlers');
const { Builder } = require('xml2js');

const User = require('./models/users');
const Chat = require('./models/chats');
const Message = require('./models/message');
const {cookieJwtAuth} = require("./cookieJwtAuth");

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

app.use(['/addChat', '/removeChat', '/Message','/Chat', '/ChatIDs', '/UserID'],cookieJwtAuth);

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/set-up', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'setup.html'));
});

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
    const accept = req.headers.accept;

    if (accept && accept.includes('application/xml')) {
      const builder = new Builder();
      const xml = builder.buildObject({ user, token });
      res.type('application/xml');
      res.status(200).send(xml);
    } else {
      res.status(200).json({ user, token, message: "Login Successful" });
    }

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/UserID', async function (req, res){
  const userID = req.user.id;
  if (userID) {
    res.status(200).json({userID})
  }
})


app.get('/findUser', async function (req, res){
  const userId = req.query.UserId;
  const user = await User.findByUserID(userId);
  // const {userId} = req.body;
  // const user = await User.findByUserID(userId);

  console.log("User: " + JSON.stringify(user));

  if (!user) {
    res.status(400).send("no user found")
  }else{

    const accept = req.headers.accept;

    if (accept && accept.includes('application/xml')) {
      const builder = new Builder();
      const xml = builder.buildObject(user);
      res.type('application/xml');
      res.send(xml);
    } else {
      res.status(200).json(user)
    }
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

    const accept = req.headers.accept;

    res.status(201).json({user})
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
    console.log(chatID);

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

    const accept = req.headers.accept;

    if (accept && accept.includes('application/xml')) {
      const builder = new Builder();
      const xml = builder.buildObject({ chatID,message: "Chat created successfully" });
      res.type('application/xml');
      res.send(xml);
    } else {
      res.status(201).json({ chatID,message: "Chat created successfully" });
    }

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
    const chat = await Chat.getChatfromID(ChatID);

    await chat.deleteChat()

    // send notification to both users (if they are online)
    if (clients[chat.User1]) {
      clients[chat.User1].emit('chat-deleted', { chatId: ChatID });
    }
    if (clients[chat.User2]) {
      clients[chat.User2].emit('chat-deleted', { chatId: ChatID });
    }


    res.status(201)
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
      res.status(201)
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

    const chatHistory = await Chat.getMessages(tableName);

    if (chatHistory) {

      const accept = req.headers.accept;

      if (accept && accept.includes('application/xml')) {
        const builder = new Builder();
        const xml = builder.buildObject({ chatHistory, message: "Messages retrieved successfully" });
        res.type('application/xml');
        res.send(xml);
      } else {
        res.status(200).json({ chatHistory, message: "Messages retrieved successfully" });
      }

    } else {
      res.status(500).send('Error in retrieving messages');
    }
  } catch (err) {
    console.error('Error retrieving chat messages:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.patch('/updateInfo', async function (req, res) {
  try {
    //Elemente werden aus Body extrahiert
    const { userId, email, legalname, phone } = req.body;

    //sucht nach User in DB
    const user = await User.findByUserID(userId);
    if (user) {   //Infos werden aktualisiert
      user.email = email;
      user.legalname = legalname;
      user.phone = phone;


      //speichert Daten in DB
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

//'multer' middleware, ermöglicht Hochladen einer einzelnen Datei; verarbeitet dann Datei und fügt sie dem req.file Objekt hinzu
app.put('/uploadProfilePicture', upload.single('profilePicture'), async (req, res) => {
  const userId = req.query.userId;
  //Erstellt die URL für das hochgeladene Bild, basierend auf dem Dateinamen, der von multer generiert wurde und im req.file`-Objekt gespeichert ist.
  const imageUrl = `/uploads/${req.file.filename}`;
  try {
    //sucht nach User in Db
    const user = await User.findByUserID(userId);
    if (user) {
      user.profilePicture = imageUrl;
      await user.saveUserinfo();

      const accept = req.headers.accept;

      if (accept && accept.includes('application/xml')) {
        const builder = new Builder();
        const xml = builder.buildObject({imageUrl});
        res.type('application/xml');
        res.send(xml);
      } else {
        res.status(200).json({ imageUrl });
      }
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
    //extrahiert message aus req.body
    const { message } = req.body;

    //sendet Anfrage an OpenAi API um ANtwort auf Nachricht von User zu generieren
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      max_tokens: 2048,
      temperature: 1,
    });

    console.log('OpenAI response:', response);

    if (response && response.choices && response.choices.length > 0) {

      const accept = req.headers.accept;

      if (accept && accept.includes('application/xml')) {
        const builder = new Builder();
        const xml = builder.buildObject({ response: response.choices[0].message.content });
        res.type('application/xml');
        res.send(xml);
      } else {
        res.json({ response: response.choices[0].message.content });
      }
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
    const accept = req.headers.accept;

    if (accept && accept.includes('application/xml')) {
      const builder = new Builder();
      const xml = builder.buildObject({ allEmojis });
      res.type('application/xml');
      res.send(xml);
    } else {
      res.json(allEmojis);
    }

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

    const accept = req.headers.accept;

    if (accept && accept.includes('application/xml')) {
      const builder = new Builder();
      const xml = builder.buildObject({chatDetails});
      res.type('application/xml');
      res.send(xml);
    } else {
      res.status(200).json({ chatDetails });
    }

  } catch (error) {
    console.error('Error fetching user or parsing chat IDs:', error);
    res.status(500).send('Error fetching user or parsing chat IDs');
  }
});

app.get('/api/trivia', async (req, res) => {
  try {
    const response = await axios.get(`https://api.api-ninjas.com/v1/trivia?category=general`, {
      headers: { 'X-Api-Key': process.env.API_TRIVIA_KEY }
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching trivia:', error);
    res.status(500).send('Error fetching trivia');
  }
});


server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
  console.log("Set-up running at: http://localhost:3000/set-up")
});