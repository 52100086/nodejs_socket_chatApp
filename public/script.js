(function () {
  const app = document.querySelector(".app");
  const socket = io();
  let uname;

  app.querySelector(".register-screen #had-account").addEventListener("click", function () {
      app.querySelector(".register-screen").classList.remove("active");
      app.querySelector(".join-screen").classList.add("active");
    });

  app.querySelector(".join-screen #join-user") .addEventListener("click", function () {
      let username = app.querySelector(".join-screen #username").value;
      let password = app.querySelector(".join-screen #password").value;
      if (username.length == 0 || password.length == 0) {
        return;
      }

      // Emit the signin event with the username and password
      socket.emit("signin", username, password);
    });

  // Listen for the signinSuccess event
  socket.on("signinSuccess", function (messages) {
    let username = app.querySelector(".join-screen #username").value;

    uname = username;
    // Render each message
    messages.forEach((message) => {
        if (message.image) {
            renderImage(message.username == uname ? "my" : "other", {
                username: message.username,
                image: message.image
            });

        } else {
            renderMessage(message.username == uname ? "my" : "other", message);
        }
    });

    app.querySelector(".join-screen").classList.remove("active");
    app.querySelector(".chat-room").classList.add("active");
  });

  // Listen for the signinFail event
  socket.on("signinFail", function () {
    alert("Signin failed, check your username or password");
  });


  //Listen for the register event
  app.querySelector(".register-screen #register-user").addEventListener("click", function () {
      let username = app.querySelector(".register-screen #username1").value;
      let password = app.querySelector(".register-screen #password1").value;
      let confirmPassword = app.querySelector(
        ".register-screen #password_confirm"
      ).value;

      if (username.length == 0 || password.length == 0) 
      {
        alert('Error: Please enter username and password');
        return;
      }else if (password != confirmPassword){
        alert('Passwords do not match');  
        return;
      }

      socket.emit("signup", username, password);
      app.querySelector(".register-screen").classList.remove("active");
      app.querySelector(".join-screen").classList.add("active");
    });


  //Listen for the chat room event  
  app.querySelector(".chat-screen #send-message").addEventListener("click", function () {
      let message = app.querySelector(".chat-screen #message-input").value;

      if (message.length == 0) {
        return;
      }
      renderMessage("my", {
        username: uname,
        text: message,
      });

      socket.emit("chat", {
        username: uname,
        text: message,
      });

      app.querySelector(".chat-screen #message-input").value = "";
    });



  //private chat button click handler  
  app.querySelector("#private-chat").addEventListener("click", function () {
    socket.emit("getUsers");
  });

  //Define other User 
  let otherUser;
  //display the remaining users in modal
  socket.on("userList", function (users) {
    let userListContainer = document.querySelector("#userList");
    userListContainer.innerHTML = ""; // Clear the container
  
    let otherUsers = users.filter(user => user !== uname);

    otherUsers.forEach((user) => {
      let userElement = document.createElement("a");
      userElement.textContent = user;
      userElement.href = "#";

      userElement.addEventListener("click", function(e) {
        e.preventDefault();

        let room = [user, uname].sort().join('');

        socket.emit("startPrivateChat", room);
        
        otherUser = user;
        app.querySelector(".chat-room").classList.remove("active");
        app.querySelector(".chat-private").classList.add("active");
        $('#privateChatModal').modal('hide');
      });
  
      let userRow = document.createElement("div");
      userRow.appendChild(userElement);
      userListContainer.appendChild(userRow);
    });
    // Show the modal
    $('#privateChatModal').modal('show');
  });


  document.querySelector("#exit-chat-private").addEventListener("click", function () {
    // Show the modal
    $('#exitPrivateChatModal').modal('show');

  });
  
  document.querySelector("#confirm-exit").addEventListener("click", function () {
    // Remove the messages
    let messageContainer = app.querySelector(".chat-private .messages");
    messageContainer.innerHTML = "";
  
    // Hide the modal
    $('#exitPrivateChatModal').modal('hide');

  
    // Switch the view back to the chat room
    app.querySelector(".chat-private").classList.remove("active");
    app.querySelector(".chat-room").classList.add("active");
  });

  document.querySelector("#send-private-message").addEventListener("click", function () {
    let message = document.querySelector("#private-message-input").value;
    let room = [otherUser, uname].sort().join('');

    socket.emit("privateChat", { message: message, room: room });
    app.querySelector(".chat-private #private-message-input").value = "";
  });


  socket.on("privateChat", function (data) {
    renderPrivateMessage(data.username == uname ? "my" : "other", data);
  });
  


  document.addEventListener("DOMContentLoaded", function() {
    //Listen exit chat room
    app.querySelector(".chat-room #exit-chat-room").addEventListener("click", function () {
      socket.emit("exituser", uname);
      window.location.href = window.location.href;
    });
  });


  socket.on("update", function (update) {
    renderMessage("update", update);
  });

  socket.on("chat", function (message) {
    renderMessage("other", message);
  });

  const fileInput = app.querySelector("#file-input");

  app.querySelector(".header .fa-image").addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
          const reader = new FileReader();
          reader.onload = function (e) {
              let imageData = e.target.result;
              socket.emit("image", {
                  username: uname,
                  image: imageData,
              });
              renderImage("my", {
                  username: uname,
                  image: imageData,
              });

          };
          reader.readAsDataURL(this.files[0]);
      }
  });



  //Render Message for chat room
  function renderMessage(type, message) {
    let messageContainer = app.querySelector(".chat-screen .messages");
    if (type == "my") {
      let el = document.createElement("div");
      el.setAttribute("class", "message my-message");
      el.innerHTML = `
                        <div>
                            <div class = "name">You</div>
                            <div class = "text">${message.text}</div>
                        </div>
                `;
      messageContainer.appendChild(el);
    } else if (type == "other") {
        let el = document.createElement("div");
        el.setAttribute("class", "message other-message");
        el.innerHTML = `
                      <div>
                          <div class = "name">${message.username}</div>
                          <div class = "text">${message.text}</div>
                      </div>
                  `;
        messageContainer.appendChild(el);
    } else if (type == "update") {
        let el = document.createElement("div");
        el.setAttribute("class", "update");
        el.innerText = message;
        messageContainer.appendChild(el);
    }

    messageContainer.scrollTop =messageContainer.scrollHeight - messageContainer.clientHeight;
  }


  //Render Message for private chat
  function renderPrivateMessage(type, message) {
    let messageContainer = app.querySelector(".chat-private .messages");
    if (type == "my") {
      let el = document.createElement("div");
      el.setAttribute("class", "message my-message");
      el.innerHTML = `
                        <div>
                            <div class = "name">You</div>
                            <div class = "text">${message.text}</div>
                        </div>
                `;
      messageContainer.appendChild(el);
    } else if (type == "other") {
        let el = document.createElement("div");
        el.setAttribute("class", "message other-message");
        el.innerHTML = `
                      <div>
                          <div class = "name">${message.username}</div>
                          <div class = "text">${message.text}</div>
                      </div>
                  `;
        messageContainer.appendChild(el);
    } else if (type == "update") {
        let el = document.createElement("div");
        el.setAttribute("class", "update");
        el.innerText = message;
        messageContainer.appendChild(el);
    }
  
    messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
  }

  socket.on("image", function (data) {
      renderImage("other", {
          username: data.username,
          image: data.image,
      });
  })

  function renderImage(type, data) {
      let messageContainer = app.querySelector(".chat-screen .messages");
      let el = document.createElement("div");
      el.setAttribute("class", "message " + type + "-message");
      if(type == "my"){
            el.innerHTML = `
            <div>
                <div class = "name">You</div>
                <img src= "${data.image}" alt="Image">
            </div>
        `;
      }else{
        el.innerHTML = `
            <div>
                <div class = "name">${data.username}</div>
                <img src= "${data.image}" alt="Image">
            </div>
        `;
      }

      messageContainer.appendChild(el);
      messageContainer.scrollTop =
          messageContainer.scrollHeight - messageContainer.clientHeight;
  }






})();
