
function loginRequest(){
    const username = document.getElementById("usernameBox").value;
    const password = document.getElementById("passwordBox").value;

     //console.log("Username: " + username + "    Password: " + password );

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
             response.json()
         })
         .then(data => {
             console.log("response: ", data)
         })
         .catch(error => {
             console.error('Error fetching data:', error);
         });
}

function failedToLogin(){

}

function switchToUserfiew(user){


}
function hello(){
    console.log("hello WOrld")
}

