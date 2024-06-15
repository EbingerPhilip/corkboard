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

  let socket;
  let targetId;
  let isGroupChat = false;
  let username;
  let emojis = [];

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

  // Benutzerinformationen abrufen und anzeigen
  try {
    const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const user = await response.json();
      username = user.username;

      console.log(username);

      usernameLink.textContent = username;
      userIdDisplay.textContent = `ID: ${userId}`;
      usernameLink.href = `/profile.html?userId=${userId}`;
    } else {
      console.error("Kein Benutzer gefunden");
    }
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
  }

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

  addUserButton.addEventListener("click", async () => {
    const userIdToAdd = userToAddInput.value.trim();
    console.log("user to add:", userIdToAdd);
    errorMessage.style.display = "none"; // Fehlermeldung immer ausblenden beim Klicken

    if (userIdToAdd) {
      if (userIdToAdd === userId) {
        console.error("You cannot add your own ID");
        errorMessage.textContent = "You cannot add your own ID";
        errorMessage.style.display = "block";
        return;
      }

      // Überprüfen, ob der Chat bereits existiert
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
        const response = await fetch(`/findUser?UserId=${encodeURIComponent(userIdToAdd)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const user = await response.json();
          console.log("User JSON response:", user);
          const chatUsername = user.username;
          console.log("Gefundener Benutzername:", chatUsername);

          // Hier den Code ausführen, wenn der Benutzer gefunden wurde
          addChatToUI(chatUsername, userIdToAdd);
          userToAddInput.value = "";
          errorMessage.style.display = "none";

          // Chat nur beim Hinzufügenden Benutzer erstellen
          // socket.emit('create-chat', { userIdToAdd, chatUsername });

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
      errorMessage.style.display = "none"; // Fehlermeldung ausblenden, wenn das Feld leer ist
    }
  });

  function addChatToUI(username, userId) {
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
      li.appendChild(a);
      chatList.appendChild(li);

      a.addEventListener("click", (event) => {
        event.preventDefault();
        chatTitle.textContent = username;
        targetId = userId;
        isGroupChat = false;
        loadChatMessages(targetId, isGroupChat);
      });
    }
  }

  function initSocket() {
    return io();
  }

  function connectSocket() {
    socket = initSocket();

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('init', userId);
    });

    socket.on('init', (data) => {
      console.log('Initialized with messages:', data.messages);
      data.messages.forEach(async msg => {
        const senderUsername = await getUsernameById(msg.fromUserId);
        displayMessage(msg.text, msg.fromUserId === userId, senderUsername, msg.timestamp);
      });
    });

    socket.on('direct', async (data) => {
      console.log('Received direct message', data);
      const senderId = data.fromUserId;

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

          if (senderId !== userId) {
            addChatToUI(senderUsername, senderId);
          }

          if (!isGroupChat && senderId === targetId) {
            displayMessage(data.text, data.fromUserId === userId, senderUsername, data.timestamp);
          }
        } else {
          console.error("Kein Benutzer gefunden");
        }
      } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
      }
    });

    socket.on('group', (data) => {
      if (isGroupChat && data.groupId === targetId) {
        console.log('Received group message', data);
        displayMessage(data.text, data.fromUserId === username, data.fromUserId, data.timestamp);
      }
    });

    socket.on('create-chat', async (data) => {
      console.log(`Erstelle Chat für User ${data.userId} mit Chatname ${data.chatName}`);

      try {
        const response = await fetch(`/findUser?UserId=${encodeURIComponent(data.userId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const user = await response.json();
          const chatUsername = user.username;
          addChatToUI(chatUsername, data.userId);
        } else {
          console.error("Kein Benutzer gefunden");
        }
      } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
      }
    });
  }

  connectSocket();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageText = input.value.trim().toLowerCase();
    if (input.value && targetId) {
      const timestamp = new Date().toISOString();
      if (isGroupChat) {
        sendGroupMessage(socket, targetId, input.value);
      } else {
        sendMessage(socket, targetId, input.value);
        createChatIfNotExists(targetId, username, input.value, timestamp);
      }
      displayMessage(input.value, true, username, timestamp);
      input.value = '';
      if (targetId === 'chatgpt') {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: messageText })
          });

          const result = await response.json();
          if (result.response) {
            displayMessage(`ChatGPT: ${result.response}`, false, 'ChatGPT', timestamp);
          } else {
            console.error('Error: No response from ChatGPT');
          }
        } catch (error) {
          console.error('Error sending message to ChatGPT:', error);
        }
      }
    }
  });

  document.querySelectorAll('.menu-list a').forEach(chatLink => {
    chatLink.addEventListener('click', (event) => {
      event.preventDefault();
      const chatName = event.target.textContent;
      chatTitle.textContent = chatName;
      targetId = event.target.getAttribute('data-user-id') || event.target.getAttribute('data-group-id');
      isGroupChat = event.target.hasAttribute('data-group-id');
      loadChatMessages(targetId, isGroupChat);
    });
  });

  function sendMessage(socket, toUserId, message) {
    const timestamp = new Date().toISOString();
    socket.emit('direct', {
      toUserId: toUserId,
      text: message,
      timestamp: timestamp
    });
  }

  function sendGroupMessage(socket, groupId, message) {
    const timestamp = new Date().toISOString();
    socket.emit('group', {
      groupId: groupId,
      text: message,
      timestamp: timestamp
    });
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

  function loadChatMessages(targetId, isGroupChat) {
    messageContainer.innerHTML = '';
    // Implement your chat loading logic here
    // Example:
    // fetch(`/chat/messages/${targetId}`)
    //   .then(response => response.json())
    //   .then(data => {
    //     data.messages.forEach(msg => {
    //       displayMessage(msg.text, msg.fromUserId === username, msg.fromUserId, msg.timestamp);
    //     });
    //   });
  }

  function createChatIfNotExists(targetId, fromUserId, message, timestamp) {
    // Placeholder for creating a chat in the future
    console.log(`Creating chat between ${fromUserId} and ${targetId} with message: ${message}`);
  }
});
