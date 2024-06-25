const db = require('../config/db')

class User {

    constructor(username, password, email, phone, legalname, profilePicture) {
        this.username = username;
        this.password = password;
        this.Chats = [];
        this.email = email;
        this.phone = phone;
        this.legalname = legalname;
        this.profilePicture = profilePicture;
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


    async saveUserinfo() {
        const sql = `
            UPDATE users SET            
            email = ?,                  
            legalname = ?,
            phone = ?,
            profilePicture = ?
            WHERE id = ?          
        `;

        await db.execute(sql, [this.email, this.legalname, this.phone, this.profilePicture, this.id]);
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
        if (users.length === 0) {
            console.log("not fund")
            return null;
        }
        const userData = users[0];
        // console.log("UserData " + JSON.stringify(userData));

        const user = new User(userData.username, userData.password, userData.email, userData.phone, userData.legalname, userData.profilePicture);
        user.id = userData.id;
        user.Chats = userData.Chats;
        delete user.password;

        return user
    }


    static async addNewChat(chatID, UserID) {
        if (!Number.isInteger(chatID)) {
            console.log("Chat: " + chatID + " has not been initialized correctly");
            return;
        }

        let sql = `SELECT * FROM users WHERE id = '${UserID}'`;
        const [user, _] = await db.execute(sql);
        if (user.length === 0) {
            console.log("User: " + UserID + " has not been found");
            return;
        }

        const userData = user[0];
        let chatsArray;
        try {
            chatsArray = JSON.parse(userData.Chats);
        } catch (err) {
            console.error("Error parsing chats array:", err);
            chatsArray = [];
        }

        if (!Array.isArray(chatsArray)) {
            chatsArray = [];
        }

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
    }

    static async getChatIDS(userID) {
        let sql = `SELECT Chats FROM users WHERE id = '${userID}'`;
        const [users, _] = await db.execute(sql);
        if (users.length === 0) {
            console.log("not found");
            return null;
        }
        const userData = users[0];
        return userData.Chats;
    }

}

module.exports = User;

