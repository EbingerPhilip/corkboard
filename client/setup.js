let User1;
let UserNR2;
let User3;

const password = "test";

const createChatsLabel = document.getElementById('create-chats-label');



document.querySelectorAll('.field-button').forEach(button => {
    button.addEventListener('click', function () {
        const fieldId = this.getAttribute('data-field');
        const username = document.getElementById(fieldId).value;
        const bottomLabel = document.querySelector(`label[for="${fieldId}"].below-label`);

        fetch('newUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.user && data.user.id) {
                    bottomLabel.textContent = `Submission successful. User ID: ${data.user.id}`;
                    bottomLabel.style.color = 'green'; // Set the color to green on success
                    if (fieldId === 'field1') {
                        User1 = data.user;
                    } else if (fieldId === 'field2') {
                        UserNR2 = data.user;
                    } else if (fieldId === 'field3') {
                        User3 = data.user;
                    }
                } else {
                    throw new Error('Invalid response data');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                bottomLabel.textContent = 'Submission failed. Please try again.';
                bottomLabel.style.color = 'red'; // Set the color to red on error
            });
    });
});

document.getElementById('create-chats-button').addEventListener('click', function () {


    if (!User1 || !UserNR2 || !User3) {
        createChatsLabel.textContent = 'one or more Users missing'
        createChatsLabel.style.color = 'red';
        return
    }

    let username = User1.username;

    fetch('/user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username, password})
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            } else {
                createChatsLabel.textContent = 'successfully longed in'
                createChatsLabel.style.color = 'green';
            }
            return response.json();
        })
        .catch(error => {
            createChatsLabel.textContent = 'Error Logging in'
            createChatsLabel.style.color = 'red';
            console.error('Error:', error);
        });


    createNewChat(UserNR2.id)
    createNewChat(User3.id)
})



function createNewChat(User2) {
    fetch('/addChat',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({User2})
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            } else {
                createChatsLabel.textContent = 'successfully created Chat'
                createChatsLabel.style.color = 'green';
            }
            return response.json();
        })
        .catch(error => {
            createChatsLabel.textContent = 'Error creating Chat with : ' + User2
            createChatsLabel.style.color = 'red';
            console.error('Error:', error);
        });

}