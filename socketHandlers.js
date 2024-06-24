const axios = require('axios');  // Ensure axios is required if you use it in the handlers

const handleSocketConnection = (io) => {
    let clients = {};

    io.on('connection', (socket) => {
        socket.on('init', (userId) => {
            clients[userId] = socket;
            socket.userId = userId;

            //falls es eine init message geben solln kann man das hier machen, ist jz aber auf der client seite auch auskommentiert
            // socket.emit('init', { messages: [] });

            // Füge den Socket zum Raum des Benutzers hinzu
            socket.join(userId);

            console.log(`User ${userId} connected`);
        });

        socket.on('create-chat', async (data) => {
            if (typeof data === 'object' && data.userIdToAdd && data.chatUsername) {
                const targetSocket = clients[data.userIdToAdd];
                if (targetSocket) {
                    console.log(`Erstelle Chat für User ${data.userIdToAdd} mit Chatname ${data.chatUsername}`);
                    targetSocket.emit('create-chat', {
                        chatName: data.chatUsername,
                        userId: data.userIdToAdd
                    });
                } else {
                    console.log('User is offline, Chat only stored in database.');
                }
            } else {
                console.warn('Received invalid data format for create-chat event:', data);
            }
        });

        socket.on('direct', async (data) => {
            if (typeof data === 'object' && data.toUserId && data.text) {
                const targetSocket = clients[data.toUserId];

                const senderResponse = await axios.get(`http://localhost:3000/findUser?UserId=${socket.userId}`);
                const senderUsername = senderResponse.data.username;

                if (targetSocket) {
                    targetSocket.emit('direct', {
                        fromUserId: socket.userId,
                        text: data.text,
                        timestamp: data.timestamp || new Date().toISOString(),
                        chatID: data.chatID
                    });
                    io.to(targetSocket.id).emit('create-chat', {
                        chatName: senderUsername,
                        userId: socket.userId,
                        chatID: data.chatID
                    });
                } else {
                    console.log('Empfänger ist offline, Nachricht wird gespeichert.');
                }
            } else {
                console.warn('Received invalid data format for direct event:', data);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                console.log(`User ${socket.userId} disconnected`);
                delete clients[socket.userId];
            }
        });
    });
};

module.exports = handleSocketConnection;
