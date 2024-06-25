document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-button").addEventListener("click", function (event){
        if ( switchButton("login")) return
        loginRequest(event)
    });
    document.getElementById("sign-up-button").addEventListener("click", function (event){
        if ( switchButton("register")) return
        registerRequest(event)
    });

});

function loginRequest(event){
    event.preventDefault();

    const username = document.getElementById("usernameBox").value;
    const password = document.getElementById("passwordBox").value;

    const request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    }

    fetch('/User', request)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.user && data.token) {
                document.cookie = `token=${data.token}; path=/`;


                // Überprüfen, ob die Chats-Liste vorhanden ist und sie als Array speichern
                if (data.user.Chats) {
                    try {
                        const chatsArray = JSON.parse(data.user.Chats); // String in Array umwandeln
                        console.log('Chats list:', chatsArray); // Debugging
                        sessionStorage.setItem('userChats', JSON.stringify(chatsArray));
                        console.log('userChats successfully stored in sessionStorage'); // Debugging
                    } catch (e) {
                        console.error('Failed to parse Chats list:', e); // Debugging
                    }
                } else {
                    console.error('Chats list is missing in the user data.');
                }


                window.location.href = `/index.html?userId=${data.user.id}`;
                console.log(data.user)
            } else {
                throw new Error('Invalid response data');
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            MessageWindow("Login failed. Please check your username and password.");
        });
}

function registerRequest(event){
    event.preventDefault()

    const username = document.getElementById("usernameBox").value;
    const password = document.getElementById("passwordBox").value;

    //console.log("cheese in client: " + username)

    const request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    };

    fetch('/newUser', request)
        .then(response => {
           switch (response.status){
               case 201:
                   loginRequest(event)
               case 400:
                   MessageWindow("Username or Password missing");
               case 409:
                    MessageWindow("Username is already in use")
               case 500:
                   MessageWindow("internal Server Error");
                   throw new Error("internal Server Error");
               default:
                   MessageWindow("Unknown Error");
                   throw new Error(`Unexpected status code: ${response.status}`)
           }
        })
}

function MessageWindow(Message){
    const loginError = document.getElementById("login-error");
    loginError.classList.remove("is-hidden");
    loginError.textContent = Message ;
}

let state = "login";

function switchButton(button){
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("login-button");

    if (button === "login"){
        loginButton.style.backgroundColor = "white";
        registerButton.style.backgroundColor = "blue";
    }else{
        loginButton.style.backgroundColor = "blue";
        registerButton.style.backgroundColor = "white";
    }

    if (button !== state){
        state = button;
        return true;
    }


    return false;
}
