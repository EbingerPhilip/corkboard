document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-button").addEventListener("click", loginRequest);
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
            } else {
                throw new Error('Invalid response data');
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            failedToLogin();
        });
}

function failedToLogin(){
    const loginError = document.getElementById("login-error");
    loginError.classList.remove("is-hidden");
    loginError.textContent = "Login failed. Please check your username and password.";
}

function hello(){
    console.log("hello World");
}
