const db = require('../config/user_db')
const User = require('./users')

class Chat {

    constructor(User1, User2) {
        this.User1 = User1;
        this.User2 = User2;
        this.Messages = [];
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
                '${JSON.stringify(this.Messages)}')
        `;

        const [newChat, _] = await db.execute(sql);
        this.id = newChat.insertId;

        await User.addNewChat(this.id, this.User1);
        await User.addNewChat(this.id, this.User2);

        return this.id;
    }







}

module.exports = Chat;

