const db = require('../config/db')

class User {

    constructor(username, password, email, phone, legalname) {
        this.username = username;
        this.password = password;
        this.Chats = [];
        this.email = email;
        this.phone = phone;
        this.legalname = legalname;
    }


    getUsername() {
        return this.username
    }

    getChats() {
        return this.Chats
    }

    getid() {
        return this.id;
    }

    async saveUser() {
        console.log(this.username)

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
            console.log("bad Passoword")
        }
    }


    async saveUserinfo() {
        const sql = `
            UPDATE users SET            
            email = ?,                  
            legalname = ?,
            phone = ?
            WHERE id = ?          
        `;

        await db.execute(sql, [this.email, this.legalname, this.phone, this.id]);
    }

    static async checkForUsername(username){
        let sql = `SELECT * FROM users WHERE username = '${username}'`;
        const [users, _] = await db.execute(sql);
        return users.length > 0;
    }


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
            console.log("not fund")
            return null; // User not found
        }
    }

    static async findByUserID(userID) {
        let sql = `SELECT * FROM users WHERE id = '${userID}'`;
        const [users, _] = await db.execute(sql);
        console.log(sql)
        if (users.length === 0) {
            console.log("not fund")
            return null;
        }
        const userData = users[0];
        console.log("UserData " + JSON.stringify(userData));

        const user = new User(userData.username, userData.password, userData.email, userData.phone, userData.legalname);
        user.id = userData.id;
        user.username = userData.username;
        delete user.password;
        delete user.Chats;

        return user
    }



    static async addNewChat(chatID, UserID) {
        if (!Number.isInteger(chatID)) {
            console.log("Chat: " + chatID + " has not been initalized correctly")
        }

        let sql = `SELECT * FROM users WHERE id = '${UserID}'`;
        const [user, _] = await db.execute(sql);
        if (user.length === 0) {
            console.log("Chat: " + chatID + " has not been initalized correctly")
        }

        const userData = user[0];
        let chatsArray = JSON.parse(userData.Chats);
        chatsArray.push(chatID);

        sql = `UPDATE users SET Chats = '${JSON.stringify(chatsArray)}' WHERE id = ${UserID}`;
        await db.execute(sql);
    }

    static async removeChat(chatID, UserID) {
        let sql = `SELECT * FROM users WHERE id = '${UserID}'`;
        const [user, _] = await db.execute(sql);
        if (user.length === 0) {
            console.log("Chat: " + chatID + " has not been initalized correctly")
        }

        const userData = user[0];
        let chatsArray = JSON.parse(userData.Chats);
        const index = chatsArray.indexOf(chatID);
        if (index !== -1) {
            chatsArray.splice(index, 1)
        } else {
            console.log(`ID ${id} not found in Chats.`);
        }

        sql = `UPDATE users SET Chats = '${JSON.stringify(chatsArray)}' WHERE id = ${UserID}`;
        await db.execute(sql);
        console.log(this.findByUsername(UserID));
    }
}

module.exports = User;

