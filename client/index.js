document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("message-form");
  const input = document.getElementById("input");
  const messageContainer = document.getElementById("messages");
  const chatTitle = document.getElementById("chat-title");
  const usernameLink = document.getElementById('username-link');
  const emojiButton = document.getElementById('emoji-button');
  const emojiList = document.getElementById('emoji-list');

  let socket;
  let targetId;
  let isGroupChat = false;
  let username;
  let emojis = [];

  function promptForUserId() {
    return prompt("Enter your user ID:");
  }

  username = promptForUserId() || "Anonymous";

  // Set the username in the profile section
  usernameLink.textContent = `User ${username}`;

  async function loadEmojis() {
    try {
      const response = await fetch(`/emoji`);
      emojis = await response.json();
      console.log(emojis); // Überprüfen Sie die Emojis im Browser-Log
      displayEmojis();
    } catch (error) {
      console.error('Error fetching emojis:', error);
    }
  }

  await loadEmojis();

  function displayEmojis() {
    emojis.forEach(emoji => {
      const option = document.createElement('option');
      option.value = emoji.character; // Stellen Sie sicher, dass die API ein Feld 'character' enthält
      emojiList.appendChild(option);
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
