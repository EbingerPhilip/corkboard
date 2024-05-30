const db = require('../config/db')

class User {
    constructor(name, password,) {

        this.username = name;
        this.password = password;
        this.Chats = [];
    }

    async saveUser() {

        let sql = `
        INSERT INTO users (
            username,
            password,
            Chats
        )
        VALUES (
            '${this.username}',   
            '${this.password}',   
            '${JSON.stringify(this.Chats)}'
        )`;
        const [newUser, _] = await db.execute(sql);
    }

    getUsername() {
        return this.username
    }

    checkpassword(login) {
        if (login == this.password) {
            return true
        } else {
            return false
            console.log("bad Passowrd")
        }
    }

    addNewChat(chatID) {

        if (Number.isInteger(chatID)) {
            this.Chats.push(chatID)
        } else {
            console.log("invalid Chat ID")
        }
    }
}

module.exports = User;

