document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("message-form");
  const input = document.getElementById("input");
  const messageContainer = document.getElementById("messages");
  const chatTitle = document.getElementById("chat-title");
  const usernameLink = document.getElementById('username-link');
  const emojiButton = document.getElementById('emoji-button');
  const emojiList = document.getElementById('emoji-list');
  const addUserButton = document.getElementById("addUserButton");
  const userToAddInput = document.getElementById("UserToAdd");
  const chatList = document.getElementById("chat-list");
  const errorMessage = document.getElementById("error-message");

  let socket;
  let targetId;
  let isGroupChat = false;
  let username;
  let emojis = [];

  function promptForUserId() {
    return prompt("Enter your user ID:");
  }

  //hier dann mit login verknüpfen
  do {
    username = promptForUserId();
  } while (username.trim() === "");

  // Set the username in the profile section
  usernameLink.textContent = `User ${username}`;

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
      if (userIdToAdd === username) {
        console.error("You cannot add your own ID");
        errorMessage.textContent = "You cannot add your own ID";
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

  function initSocket() {
    return io();
  }

  function connectSocket() {
    socket = initSocket();

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('init', username);
    });

    socket.on('init', (data) => {
      console.log('Initialized with messages:', data.messages);
      data.messages.forEach(msg => {
        displayMessage(msg.text, msg.fromUserId === username, msg.fromUserId, msg.timestamp);
      });
    });

    socket.on('direct', (data) => {
      if (!isGroupChat && data.fromUserId === targetId) {
        console.log('Received direct message', data);
        displayMessage(data.text, data.fromUserId === username, data.fromUserId, data.timestamp);
      }
    });

    socket.on('group', (data) => {
      if (isGroupChat && data.groupId === targetId) {
        console.log('Received group message', data);
        displayMessage(data.text, data.fromUserId === username, data.fromUserId, data.timestamp);
      }
    });
  }

  connectSocket();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.value && targetId) {
      const timestamp = new Date().toISOString();
      if (isGroupChat) {
        sendGroupMessage(socket, targetId, input.value);
      } else {
        sendMessage(socket, targetId, input.value);
      }
      displayMessage(input.value, true, username, timestamp);
      input.value = '';
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

  function displayMessage(message, isOwnMessage, fromUserId, timestamp) {
    const item = document.createElement('div');
    item.classList.add('message-bubble');
    if (isOwnMessage) {
      item.classList.add('you');
    } else {
      item.classList.add('them');
    }

    const messageHeader = document.createElement('div');
    messageHeader.classList.add('message-header');
    messageHeader.textContent = isOwnMessage ? `You` : `User ${fromUserId}`;

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
});
