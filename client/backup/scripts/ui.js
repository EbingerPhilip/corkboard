function displayEmojis(emojis, emojiList) {
    emojis.forEach(emoji => {
        const option = document.createElement('option');
        option.value = emoji.character;
        emojiList.appendChild(option);
    });
}

function addChatToUI(username, userId, chatID, chatList, messageContainer, chatTitle, loadChatMessages, displayMessage, currentUserId) {
    //Create a new chatButton and set data
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "chat-link";
    a.href = "#";
    a.textContent = username;
    a.dataset.userId = userId;
    a.dataset.chatId = chatID;
    li.appendChild(a);

    //add Event Listener which loads the chat and messages
    a.addEventListener("click", async (event) => {
        event.preventDefault();
        chatTitle.textContent = username;
        messageContainer.innerHTML = '';
        const chatMessages = await loadChatMessages(chatID);
        if (chatMessages && chatMessages.chatHistory) {
            chatMessages.chatHistory.forEach(msg => {
                displayMessage(msg.text, msg.senderID === currentUserId, msg.sender, msg.timestamp, messageContainer);
            });
        }
        console.log(`Chat ID: ${chatID}`);
    });

    //add a deleteButton
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.className = "delete-button";
    //remove chat from database when clicking
    deleteButton.onclick = async function() {
        await deleteChat(chatID);
        //remove chat from the chatlist
        li.remove();
    };
    li.appendChild(deleteButton);

    chatList.appendChild(li);
}

function displayMessage(message, isOwnMessage, senderUsername, timestamp, messageContainer) {
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

export {
    displayEmojis,
    addChatToUI,
    displayMessage
};
