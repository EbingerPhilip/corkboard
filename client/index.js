import { getChatDetails, findUser, loadEmojis, saveNewChatInDatabase, deleteChat, saveMessageInDatabase, loadChatMessages } from './scripts/api.js';
import { displayEmojis, addChatToUI, displayMessage } from './scripts/ui.js';
import { connectSocket } from './scripts/socket.js';

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
  const profilePicture = document.getElementById('profile-picture');

  let targetId;
  let isGroupChat = false;
  let username;
  let emojis = [];
  let chatId;

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

  await displayMessage('Willkommen bei Corkboard', false, 'Corkboard', new Date(), messageContainer);

  try {
    const user = await findUser(userId);
    if (user) {
      username = user.username;
      usernameLink.textContent = username;
      userIdDisplay.textContent = `ID: ${userId}`;
      usernameLink.href = `/profile.html?userId=${userId}`;
      profilePicture.src = user.profilePicture;
    }
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
  }

  const chatDetails = await getChatDetails(parseInt(userId, 10));
  if (Array.isArray(chatDetails)) {
    const addedChats = new Set();
    let userIDtoAdd;
    let usernameToAdd;

    chatDetails.forEach(chat => {
      const ownUserId = parseInt(userId, 10);
      const otherUserIDD = parseInt(chat.userId2, 10);

      if (otherUserIDD === ownUserId) {
        userIDtoAdd = chat.userId1;
        usernameToAdd = chat.username1;
      } else {
        userIDtoAdd = chat.userId2;
        usernameToAdd = chat.username2;
      }

      if (!addedChats.has(chat.chatId)) {
        addChatToUI(usernameToAdd, userIDtoAdd, chat.chatId, chatList, messageContainer, chatTitle, loadChatMessages, displayMessage, userId);
        addedChats.add(chat.chatId);
      }
    });
  } else {
    console.log('User has no chats or no chat details found or chatDetails is not an array.');
  }

  function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  const observer = new MutationObserver(scrollToBottom);
  observer.observe(messageContainer, { childList: true });

  scrollToBottom();

  emojis = await loadEmojis();
  displayEmojis(emojis, emojiList);

  addUserButton.addEventListener("click", async () => {
    const userIdToAdd = userToAddInput.value.trim();
    console.log("user to add:", userIdToAdd);
    errorMessage.style.display = "none";

    if (userIdToAdd) {
      if (userIdToAdd === userId) {
        console.error("You cannot add your own ID");
        errorMessage.textContent = "You cannot add your own ID";
        errorMessage.style.display = "block";
        return;
      }

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
        const user = await findUser(userIdToAdd);
        if (user) {
          const chatUsername = user.username;
          console.log("Gefundener Benutzername:", chatUsername);

          const chatID = await saveNewChatInDatabase(userId, userIdToAdd);
          addChatToUI(chatUsername, userIdToAdd, chatID, chatList, messageContainer, chatTitle, loadChatMessages, displayMessage, userId);
          userToAddInput.value = "";
          errorMessage.style.display = "none";
        } else {
          errorMessage.textContent = "User not found";
          errorMessage.style.display = "block";
        }
      } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
        errorMessage.textContent = "Error during request";
        errorMessage.style.display = "block";
      }
    } else {
      errorMessage.style.display = "none";
    }
  });

  const socket = connectSocket(io, userId, chatList, messageContainer, chatTitle, username, isGroupChat, targetId);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageText = input.value.trim().toLowerCase();
    if (input.value && targetId) {
      const timestamp = new Date().toISOString();
      if (isGroupChat) {
        sendGroupMessage(socket, targetId, input.value);
      } else {
        sendMessage(socket, targetId, input.value, chatId);
        displayMessage(input.value, true, username, timestamp, messageContainer);
      }

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
            displayMessage(`ChatGPT: ${result.response}`, false, 'ChatGPT', timestamp, messageContainer);
          } else {
            console.error('Error: No response from ChatGPT');
          }
        } catch (error) {
          console.error('Error sending message to ChatGPT:', error);
        }
      } else {
        console.log(input.value);
        await saveMessageInDatabase(userId, username, chatId, input.value);
      }
      input.value = '';
    }
  });

  function sendMessage(socket, toUserId, message, chatID) {
    const timestamp = new Date().toISOString();
    socket.emit('direct', {
      toUserId: toUserId,
      text: message,
      timestamp: timestamp,
      chatID: chatID
    });
  }

  document.querySelectorAll('.menu-list a').forEach(chatLink => {
    chatLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const chatName = event.target.textContent;
      chatTitle.textContent = chatName;
      targetId = event.target.getAttribute('data-user-id') || event.target.getAttribute('data-group-id');
      chatId = event.target.getAttribute('data-chat-id');
      isGroupChat = event.target.hasAttribute('data-group-id');
      messageContainer.innerHTML = '';
      const chatMessages = await loadChatMessages(chatId);
      if (chatMessages && chatMessages.chatHistory) {
        chatMessages.chatHistory.forEach(msg => {
          displayMessage(msg.text, msg.senderID === userId, msg.sender, msg.timestamp, messageContainer);
        });
      }
      console.log(`Chat ID: ${chatId}`);
    });
  });

  function sendGroupMessage(socket, groupId, message) {
    const timestamp = new Date().toISOString();
    socket.emit('group', {
      groupId: groupId,
      text: message,
      timestamp: timestamp
    });
  }
});
