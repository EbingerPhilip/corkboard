document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-button").addEventListener("click", loginRequest);
    document.getElementById("register-Button").addEventListener("click", registerRequest);

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

    const request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    };

    fetch('/newUser', request)
        .then(response => {
            if (response == null) {

            }

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
