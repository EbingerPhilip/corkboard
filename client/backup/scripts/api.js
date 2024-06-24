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
        console.log('Received chat details:', data.chatDetails);
        return data.chatDetails;
    } catch (error) {
        console.error('Error fetching chat details:', error);
    }
}

async function findUser(userId) {
    try {
        const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            return await response.json();
        } else {
            console.error("Kein Benutzer gefunden");
        }
    } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
    }
}

async function loadEmojis() {
    try {
        const response = await fetch(`/emoji`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching emojis:', error);
    }
}

async function saveNewChatInDatabase(userId, userIdToAdd) {
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

async function saveMessageInDatabase(userId, username, chatId, message) {
    try {
        console.log('Saving message in database...');

        const response = await fetch(`/Message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userid: userId, username: username, ChatID: chatId, TextMessage: message })
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

async function deleteChat(chatID) {
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

async function loadChatMessages(chatID) {
    try {
        const response = await fetch(`/Chat?ChatID=${chatID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            return await response.json();
        } else {
            console.error("Error loading chat messages:", response.statusText);
        }
    } catch (error) {
        console.error("Error loading chat messages:", error);
    }
}

export {
    getChatDetails,
    findUser,
    loadEmojis,
    saveNewChatInDatabase,
    saveMessageInDatabase,
    deleteChat,
    getUsernameById,
    loadChatMessages
};
