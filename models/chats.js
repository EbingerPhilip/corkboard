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
            Data JSON NOT NULL
        )`;
        try {
            await db.execute(createTableSQL);
            console.log(`Table '${tableName}' created successfully`);
        } catch (error) {
            console.error(`Error creating table '${tableName}':`, error);
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
        if (db._closed) {
            throw new Error('Connection pool is closed.');
        }

       const sql = `Drop Table if exists \`${this.Messages}\``;
       try{
           await User.removeChat(this.id, this.User1);
           await User.removeChat(this.id, this.User2);

           const connection = await db.getConnection();
           await connection.execute(sql);
           connection.release();

          console.log(`Table ${this.Messages} deleted successfully`)
           return true
       }catch (err){
           console.log(`Error deleting table '${this.Messages}':`, error)
           return false
       }
    }

    static async getMessages(TableName){
        try {
            let sql = `SELECT * FROM ${TableName}`
            const [chatString, _] = await db.execute(sql);
            const chat = [];
            if (chatString.length > 0) {
                for (let i = 0; i < chatString.length; i++){
                    const row = chatString[i]
                    const message = row.Data;

                    chat.push(JSON.parse(message))
                }
                return chat
            }else{
                return null
            }

        }catch (err){
            console.log(err.message)
        }
    }

    static async findChat(user1, user2) {
        const sql = `
      SELECT * FROM chats
      WHERE (User1 = '${user1}' AND User2 = '${user2}')
      OR (User1 = '${user2}' AND User2 = '${user1}')
      LIMIT 1
    `;
        const [result, _] = await db.execute(sql);
        return result.length > 0 ? result[0] : null;
    }

    static async createMessageTable(tableName) {
        if (!tableName) {
            throw new Error('Table name cannot be empty');
        }

        const createTableSQL = `
      CREATE TABLE ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Data JSON NOT NULL
      )
    `;
        try {
            await db.execute(createTableSQL);
            console.log(`Table '${tableName}' created successfully`);
        } catch (error) {
            console.error(`Error creating table '${tableName}':`, error);
        }
    }
}



module.exports = Chat;