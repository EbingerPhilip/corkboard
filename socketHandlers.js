const axios = require('axios');  // Ensure axios is required if you use it in the handlers

const handleSocketConnection = (io) => {
    let clients = {};

    io.on('connection', (socket) => {
        socket.on('init', (userId) => {
            //add socket to clients list
            clients[userId] = socket;
            //add user id to socket
            socket.userId = userId;
            // socket.join(userId);

            console.log(`User ${userId} connected`);
        });

        socket.on('direct', async (data) => {
            if (typeof data === 'object' && data.toUserId && data.text) {
                const targetSocket = clients[data.toUserId];

                //get sender username
                const senderResponse = await axios.get(`http://localhost:3000/findUser?UserId=${socket.userId}`);
                const senderUsername = senderResponse.data.username;

                //if the user is online
                if (targetSocket) {
                    //sends message to the target client
                    targetSocket.emit('direct', {
                        fromUserId: socket.userId,
                        text: data.text,
                        timestamp: data.timestamp,
                        chatID: data.chatID
                    });
                    //triggers the create Chat event at the target
                    targetSocket.emit('create-chat', {
                        chatName: senderUsername,
                        userId: socket.userId,
                        chatID: data.chatID
                    });
                } /*else {
                    //receiver is offline, messages are just stored in the database
                }*/
            } else {
                console.warn('Received invalid data format for direct event:', data);
            }
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
                } /*else {
                    //User is offline, Chat only stored in database
                }*/
            } else {
                console.warn('Received invalid data format for create-chat event:', data);
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
