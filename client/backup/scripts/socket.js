import { getUsernameById, saveMessageInDatabase, loadChatMessages } from './api.js';
import { displayMessage, addChatToUI } from './ui.js';

function initSocket(io) {
    return io();
}

function connectSocket(io, userId, chatList, messageContainer, chatTitle, username, isGroupChat, targetId) {
    let socket = initSocket(io);

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('init', userId);
    });

    socket.on('direct', async (data) => {
        console.log('Received direct message', data);
        const senderId = data.fromUserId;

        try {
            const sender = await getUsernameById(senderId);

            if (senderId !== userId) {
                const chatID = data.chatID;

                addChatToUI(sender.username, senderId, chatID, chatList, messageContainer, chatTitle, loadChatMessages, displayMessage, userId);
                console.log(`Creating new chat with user ${senderId}`);
            }

            if (!isGroupChat && senderId === targetId) {
                displayMessage(data.text, data.fromUserId === userId, sender.username, data.timestamp, messageContainer);
            }
        } catch (error) {
            console.error("Error fetching sender data:", error);
        }
    });

    socket.on('group', (data) => {
        if (isGroupChat && data.groupId === targetId) {
            console.log('Received group message', data);
            displayMessage(data.text, data.fromUserId === username, data.fromUserId, data.timestamp, messageContainer);
        }
    });

    socket.on('create-chat', async (data) => {
        console.log(`Erstelle Chat für User ${data.userId} mit Chatname ${data.chatName}`);

        try {
            const user = await getUsernameById(data.userId);
            addChatToUI(user.username, data.userId, data.chatID, chatList, messageContainer, chatTitle, loadChatMessages, displayMessage, userId);
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    });

    return socket;
}

export {
    initSocket,
    connectSocket
};
