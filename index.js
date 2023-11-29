const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
app.use(express.static(path.join(__dirname, "/public")));
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; 
const iv = crypto.randomBytes(16);
let loggedInUsers = [];
const Schema = mongoose.Schema;





const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});


const MessageSchema = new Schema({
    username: { type: String, required: true },
    text: { type: String},
    image: { type: String }
});
const Message = mongoose.model('Message', MessageSchema);

const User = mongoose.model('User', UserSchema);

async function connect() {
    try {
        await mongoose.connect('mongodb://127.0.0.1/midterm');
        console.log("Connect Successful ")
    } catch (error) {
        console.log(error)
    }
}

connect();


app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);




io.on('connection', function(socket){

    //New User Event
    socket.on('newuser', function(username){
        socket.broadcast.emit("update", username + " joined the conversation");
    })


    //User Exit Event
    socket.on('exituser', function(username){
        socket.broadcast.emit("update", username + " left the conversation");
    })


    //Get All Users function and emit the userList event
    socket.on('getUsers', async function(){
        let users = await User.find({});
        let usernames = users.map(user => user.username);
        socket.emit("userList", usernames);
    });





    //Chat Event
    socket.on('chat', function(message){
        let encryptedText = encrypt(message.text);
        let newMessage = new Message({ username: message.username, text: JSON.stringify(encryptedText) });
        newMessage.save().catch(err => console.log(err));
        socket.broadcast.emit("chat", message);
    });


    //Join 2 users to room
    socket.on('startPrivateChat', function(room){
        socket.join(room);
    });


    socket.on('privateChat', function(data){
        // Emit the privateChat event to the room with the message and the username
        io.to(data.room).emit('privateChat', { text: data.message, username: socket.username });
    });


    //Send Image Event 
    socket.on('image', function(data){    
        let newMessage = new Message({ username: data.username, image: data.image });
        newMessage.save().catch(err => console.log(err));
        socket.broadcast.emit("image", {
            username: data.username,
            image: newMessage.image
        });
    });

    //Sign Up Event
    socket.on('signup', async function(username, password, confirmPassword){
        bcrypt.hash(password, 10, async function(err, hash) {
            let user = new User({ username: username, password: hash });
            try {
                await user.save();
                console.log('User saved successfully!');
            } catch (err) {
                console.log(err);
            }
        });
    });


    //Sign In Event
    socket.on('signin', async function(username, password){
        try {
            let user = await User.findOne({ username: username });
            if (user) {
                bcrypt.compare(password, user.password, async function(err, res) {
                    if(res) {

                        //Defined socket username when logged in
                        socket.username = username;
                        let messages = await Message.find({});
                        let decryptedMessages = messages.map(message => {
                            let decryptedText = message.text ? decrypt(JSON.parse(message.text)) : null;
                            return { username: message.username, text: decryptedText, image: message.image };
                        });
                        if (!loggedInUsers.includes(username)) {
                            loggedInUsers.push(username);
                            socket.broadcast.emit("update", username + " joined the conversation");
                        }
                        socket.emit("signinSuccess", decryptedMessages);
                    } else {
                        socket.emit("signinFail");
                    } 
                });
            } else {
                socket.emit("signinFail");
            }
        } catch (err) {
            throw err;
        }
    });


    //Encrypt message function 
    function encrypt(text) {
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return {
            iv: iv.toString('hex'),
            content: encrypted.toString('hex')
        };
    }


    //Decrypt message function
    function decrypt(hash) {
        const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
        const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
        return decrpyted.toString();
    }

})

server.listen(port);

