const db = require('../config/db')
const User = require('./users')

class Chat {

    constructor(User1, User2) {
        this.User1 = User1;
        this.User2 = User2;
        this.Messages = "";
    }

    async saveChat() {

        let sql = `
            INSERT INTO chats
                (User1,
                User2,
                Messages)
            VALUES
                ('${this.User1}',
                '${this.User2}',
                '')
        `;

        const [newChat, _] = await db.execute(sql);
        this.id = newChat.insertId;
        const TableId = `Chat${this.id}`

        sql = `
        UPDATE chats
        SET Messages = '${TableId}'
        WHERE id = ${this.id}
        `;

        await db.execute(sql);
        await User.addNewChat(this.id, this.User1);
        await User.addNewChat(this.id, this.User2);
        await Chat.createMessageTable(TableId)

        return this.id;
    }

    static async createMessageTable(tableName) {
        if (!tableName) {
            throw new Error('Table name cannot be empty');
        }

        const createTableSQL = `
        CREATE TABLE ${tableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            sender_name VarChar(100) NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
        try {
            await db.execute(createTableSQL);
            console.log(`Table '${tableName}' created successfully`);
        } catch (error) {
            console.error(`Error creating table '${tableName}':`, error);
        } finally {
            await db.end();
        }
    }

    static async getChatfromID(chatID){
        let sql = `SELECT * FROM chats WHERE id = '${chatID}'`;
        const [chatrow, _] = await db.execute(sql);
        if (chatrow.length > 0) {
            const chatData = chatrow[0];

            const chat = new Chat(chatData.User1, chatData.User2);
            chat.id = chatData.id;
            chat.Messages = chatData.Messages;
            console.log(chat)

            return chat
        } else {
            return null; // User not found
        }
    }

    async deleteChat(){





    }
}

module.exports = Chat;