const db = require('../config/user_db')

class User {

    constructor(name, password,) {
        this.username = name;
        this.password = password;
        this.Chats = [];
    }

    getUsername() {
        return this.username
    }
    getChats(){
        return this.Chats
    }
    getid(){
        return this.id;
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
        this.id = newUser.insertId;
    }

    checkpassword(login) {
        if (login === this.password) {
            return true
        } else {
            return false
            console.log("bad Passowrd")
        }
    }

    // Database functions start here

    static async findByUsername(username) {
        let sql = `SELECT * FROM users WHERE username = '${username}'`;
        const [users, _] = await db.execute(sql);
        if (users.length > 0) {
            const userData = users[0];

            const user = new User(userData.username, userData.password);
            user.id = userData.id;
            user.Chats =  JSON.parse(userData.Chats);

            return user
        } else {
            return null; // User not found
        }
    }

    // adds ChatID to Chats[], returns true if successful
    static async addNewChat(chatID, UserID) {
        if (!Number.isInteger(chatID)) {
            console.log("Chat: " + chatID + " has not been initalized correctly")
        }

        let sql = `SELECT * FROM users WHERE id = '${UserID}'`;
        const [user, _] = await db.execute(sql);
        if (user.length === 0){
            console.log("Chat: " + chatID + " has not been initalized correctly")
        }

        const userData = user[0];
        let chatsArray = JSON.parse(userData.Chats);
        chatsArray.push(chatID);

        sql = `UPDATE users SET Chats = '${JSON.stringify(chatsArray)}' WHERE id = ${UserID}`;
        await db.execute(sql);
        console.log(this.findByUsername(UserID))
    }
}

module.exports = User;

