async function getChatDetails(userId) {
  try {
    const response = await fetch(`/ChatIDs?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received chat details:', data.chatDetails); // Debugging
    return data.chatDetails;
  } catch (error) {
    console.error('Error fetching chat details:', error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("message-form");
  const input = document.getElementById("input");
  const messageContainer = document.getElementById("messages");
  const chatTitle = document.getElementById("chat-title");
  const usernameLink = document.getElementById("username-link");
  const userIdDisplay = document.getElementById("user-id-display");
  const emojiButton = document.getElementById("emoji-button");
  const emojiList = document.getElementById("emoji-list");
  const addUserButton = document.getElementById("addUserButton");
  const userToAddInput = document.getElementById("UserToAdd");
  const chatList = document.getElementById("chat-list");
  const errorMessage = document.getElementById("error-message");
  const messages = document.getElementById('messages');
  const profilePicture = document.getElementById('profile-picture');

  let socket;
  let targetId;
  let username;
  let emojis = [];
  let chatId;

  //get username from url
  //todo: geht usernamefromcookies??
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('userId');
  console.log(userId);

  if (!userId) {
    window.location.href = '/login.html';
    return;
  }

  emojiButton.textContent = '😊';
  emojiButton.classList.add('button', 'is-rounded', 'is-small');
  form.appendChild(emojiButton);



  try {
      //get Username from userid
    const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const user = await response.json();
      username = user.username;

      //set user details in profile section
      usernameLink.textContent = username;
      userIdDisplay.textContent = `ID: ${userId}`;
      usernameLink.href = `/profile.html?userId=${userId}`;
      profilePicture.src = user.profilePicture;

      //send welcome message
      await displayMessage('Willkommen bei Corkboard ' + username +"!", false, 'Corkboard', new Date());

    } else {
      console.error("Kein Benutzer gefunden");
    }
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
  }

  //load all chats
  const chatDetails = await getChatDetails(parseInt(userId, 10));
    if (Array.isArray(chatDetails)) {

    let userIDtoAdd;
    let usernameToAdd;

    chatDetails.forEach(chat => {
      const ownUserId = parseInt(userId, 10);
      const otherUserIDD = parseInt(chat.userId2, 10);

      //check if target userid is own userid --> switch
      if (otherUserIDD === ownUserId) {
        userIDtoAdd = chat.userId1;
        usernameToAdd = chat.username1;
      } else {
        userIDtoAdd = chat.userId2;
        usernameToAdd = chat.username2;
      }

      //add the chat to the ui
      addChatToUI(usernameToAdd, userIDtoAdd, chat.chatId);
    });
  } else {
    console.log('User has no chats or no chat details found or chatDetails is not an array.');
  }

    //set eventListener for every loaded chat
    //opens the chat and sets the right parameters when clickin
    //loads the messages from the database
  document.querySelectorAll('.menu-list a').forEach(chatLink => {
        chatLink.addEventListener('click', (event) => {
            //prevents from refreshing the site when clicking
            event.preventDefault();
            const chatName = event.target.textContent;
            chatTitle.textContent = chatName;
            targetId = event.target.getAttribute('data-user-id')
            chatId = event.target.getAttribute('data-chat-id');
            messageContainer.innerHTML = '';
            loadChatMessages(chatId);
            console.log(`Chat ID: ${chatId}`);
        });
    });

    function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  const observer = new MutationObserver(scrollToBottom);
  observer.observe(messages, { childList: true });

  scrollToBottom();

  async function loadEmojis() {
    try {
      const response = await fetch(`/emoji`);
      emojis = await response.json();
      console.log(emojis);
      displayEmojis();
    } catch (error) {
      console.error('Error fetching emojis:', error);
    }
  }

  await loadEmojis();

  function displayEmojis() {
    emojis.forEach(emoji => {
      const option = document.createElement('option');
      option.value = emoji.character;
      emojiList.appendChild(option);
    });
  }

  connectSocket();

  function connectSocket() {
    //initialise the socket connection
    socket = initSocket();

    //connect to the server
    socket.on('connect', () => {
      console.log('Connected to server');
      //sent "init" event to server
      socket.emit('init', userId);
    });


    //receive a message
    socket.on('direct', async (data) => {
      const senderId = data.fromUserId;

      //get username
      try {
        const response = await fetch(`/findUser?UserId=${encodeURIComponent(senderId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const sender = await response.json();
          const senderUsername = sender.username;

          //if the message isn´t from
          // if (senderId !== userId) {
            const chatID = data.chatID;
            addChatToUI(senderUsername, senderId, chatID);
          // }

          //display the Message if user is in the chat
          if (senderId === targetId) {
            await displayMessage(data.text, false, senderUsername, data.timestamp);
          }
        } else {
          console.error("Kein Benutzer gefunden");
        }
      } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
      }
    });

    socket.on('create-chat', async (data) => {
      try {
        //get username
        const response = await fetch(`/findUser?UserId=${encodeURIComponent(data.userId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const user = await response.json();
          const chatUsername = user.username;
          addChatToUI(chatUsername, data.userId, data.chatID);
        } else {
          console.error("Kein Benutzer gefunden");
        }
      } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
      }
    });
  }

    function initSocket() {
        return io();
    }


  //send Button
  form.addEventListener('submit', async (event) => {
      //prevent side reload
    event.preventDefault();
    const messageText = input.value
    if (messageText && targetId) {
      const timestamp = new Date().toISOString();

      displayMessage(messageText, true, username, timestamp);


      //if you send to chatgpt
      if (targetId === 'chatgpt') {
        try {
          //send message to server
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: messageText })
          });

          const result = await response.json();

          if (result.response) {
              //display the result message
            displayMessage(`ChatGPT: ${result.response}`, false, 'ChatGPT', timestamp);
          } else {
            console.error('Error: No response from ChatGPT');
          }
        } catch (error) {
          console.error('Error sending message to ChatGPT:', error);
        }
      } else {
        //if you don´t send to chat gpt send the message to the server and save the message in the database
        sendMessage(socket, targetId, input.value, chatId);
        await saveMessageInDatabase(userId, username, chatId, input.value);
      }
      //clear the input field
      input.value = '';
    }
  });

  //add User
  addUserButton.addEventListener("click", async () => {
        const userIdToAdd = userToAddInput.value.trim();
        console.log("user to add:", userIdToAdd);
        errorMessage.style.display = "none";

        //if there is an input
        if (userIdToAdd) {
            //filter own userid
            if (userIdToAdd === userId) {
                console.error("You cannot add your own ID");
                errorMessage.textContent = "You cannot add your own ID";
                errorMessage.style.display = "block";
                return;
            }

            //filter existing chats
            const existingChat = Array.from(chatList.children).find(
                li => li.querySelector('a').dataset.userId === userIdToAdd
            );
            if (existingChat) {
                console.error("Chat already exists");
                errorMessage.textContent = "Chat already exists";
                errorMessage.style.display = "block";
                return;
            }

            try {
                //try if there is a user with this id and get his username
                const response = await fetch(`/findUser?UserId=${encodeURIComponent(userIdToAdd)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 200) {
                    const user = await response.json();
                    const chatUsername = user.username;

                    //save Chat in Database
                    const chatID = await saveNewChatInDatabase(userIdToAdd);
                    //add Chat to UI :D
                    addChatToUI(chatUsername, userIdToAdd, chatID);
                    //reset input und error message
                    userToAddInput.value = "";
                    errorMessage.style.display = "none";
                } else {
                    console.error("Kein Benutzer gefunden");
                    errorMessage.textContent = "User not found";
                    errorMessage.style.display = "block";
                }
            } catch (error) {
                console.error("Fehler bei der Anfrage:", error);
                errorMessage.textContent = "Error during request";
                errorMessage.style.display = "block";
            }
        } else {
            //reset error message if input is empty
            errorMessage.style.display = "none";
        }
    });

  function addChatToUI(username, userId, chatID) {
        const existingChat = Array.from(chatList.children).find(
            li => li.querySelector('a').dataset.userId === userId
        );

        if (!existingChat) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "chat-link";
            a.href = "#";
            a.textContent = username;
            a.dataset.userId = userId;
            a.dataset.chatId = chatID;
            li.appendChild(a);

            a.addEventListener("click", (event) => {
                event.preventDefault();
                chatTitle.textContent = username;
                targetId = userId;
                chatId = chatID;
                messageContainer.innerHTML = '';
                loadChatMessages(chatID);
                console.log(`Chat ID: ${chatID}`);
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "X";
            deleteButton.className = "delete-button";
            deleteButton.onclick = async function() {
                await deleteChat(chatId, li);
            };
            li.appendChild(deleteButton);

            chatList.appendChild(li);
        }
    }

  function sendMessage(socket, toUserId, message, chatID) {
    const timestamp = new Date().toISOString();
    //send message to the server
    socket.emit('direct', {
      toUserId: toUserId,
      text: message,
      timestamp: timestamp,
      chatID: chatID
    });
  }

  async function displayMessage(message, isOwnMessage, senderUsername, timestamp) {
    const item = document.createElement('div');
    item.classList.add('message-bubble');
    if (isOwnMessage) {
      item.classList.add('you');
    } else {
      item.classList.add('them');
    }

    const messageHeader = document.createElement('div');
    messageHeader.classList.add('message-header');
    messageHeader.textContent = isOwnMessage ? `You` : `${senderUsername}`;

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = message;

    const messageTimestamp = document.createElement('div');
    messageTimestamp.classList.add('message-timestamp');
    messageTimestamp.textContent = new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    item.appendChild(messageHeader);
    item.appendChild(messageText);
    item.appendChild(messageTimestamp);

    messageContainer.appendChild(item);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  async function saveNewChatInDatabase(userIdToAdd) {
    try {
      console.log('Saving or finding chat in database...');

      const response = await fetch(`/addChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({User1: userId, User2: userIdToAdd })
      });

      if (response.status === 200 || response.status === 201) {
        const result = await response.json();
        console.log("Chat successfully saved in database with chat ID:", result.chatID);
        return result.chatID;
      } else {
        console.error("Error saving or finding chat in database:", response.statusText);
      }
    } catch (error) {
      console.error("Error saving or finding chat in database:", error);
    }
  }

  async function saveMessageInDatabase( userid, username, chatId, message) {
    try {
      console.log('Saving message in database...');

      const response = await fetch(`/Message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userid: userid,  username: username, ChatID: chatId, TextMessage: message })
      });

      if (response.status === 201) {
        console.log("Message successfully saved in database");
      } else {
        console.error("Error saving message in database:", response.statusText);
      }
    } catch (error) {
      console.error("Error saving message in database:", error);
    }
  }

    async function loadChatMessages(chatID) {
        try {
            const response = await fetch(`/Chat?ChatID=${chatID}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                const result = await response.json();
                console.log('Received chat history:', result.chatHistory); // Debugging
                messageContainer.innerHTML = '';
                result.chatHistory.forEach(msg => {
                    console.log('Message:', msg); // Debugging

                    displayMessage(msg.text, msg.senderID === userId, msg.sender, msg.timestamp);
                });
            } else {
                console.error("Error loading chat messages:", response.statusText);
            }
        } catch (error) {
            console.error("Error loading chat messages:", error);
        }
    }

  async function deleteChat(chatID, chatElement) {
    try {
      const response = await fetch('/removeChat', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ChatID: chatID })
      });

      if (response.ok) {
        console.log("Chat successfully deleted");
        chatElement.remove();
      } else {
        console.error("Error deleting chat:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }

  async function getUsernameById(userId) {
        try {
            const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                const user = await response.json();
                return user.username;
            } else {
                console.error("Kein Benutzer gefunden");
                return "Unknown";
            }
        } catch (error) {
            console.error("Fehler bei der Anfrage:", error);
            return "Unknown";
        }
    }
});
