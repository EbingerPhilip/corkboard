const db = require('../config/db')



class Message{

    constructor(UserID,Username,Text) {
        this.senderID = UserID;
        this.sender = Username;
        this.text = Text;
        this.timestamp = new Date();
    }


    static async saveMessage(tableName, Message){

        let sql = `INSERT INTO ${tableName} (Data) VALUES (?)`;
        const values = [JSON.stringify(Message)];
        try {
            const [newMessage, _] = await db.execute(sql, values);
            this.id = newMessage.insertId;
            return true
        }catch (err){
            console.error(`Error saving message to table '${tableName}':`, error);
            return false;
        }

    }

}

module.exports = Message;