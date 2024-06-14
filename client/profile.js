document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');

    const emailElement = document.getElementById('profile-email');
    const nameElement = document.getElementById('profile-name');
    const phoneElement = document.getElementById('profile-phone');
    const profilePicture = document.getElementById('profile-picture');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const backButton = document.getElementById('back-button');


    document.getElementById('profile-username').textContent = `User ${userId}`;

    // Beispiel: Daten vom Server abrufen und im Profil anzeigen
    // Hier sind Platzhalterdaten
    const email = "user@example.com";
    const name = "John Doe";
    const phone = "123-456-7890";

    emailElement.textContent = email;
    nameElement.textContent = name;
    phoneElement.textContent = phone;

    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');


    editButton.addEventListener('click', () => {
        toggleEdit(true);
    });

    saveButton.addEventListener('click', async () => {
        await saveUserinfo();
        toggleEdit(false);
    });


    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicture.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    backButton.addEventListener('click', () => {
        window.location.href = `/index.html?userId=${userId}`;
    });

    function toggleEdit(isEditing) {
        if (isEditing) {
            emailElement.innerHTML = `<input id="input-email" class="input" type="email" value="${emailElement.textContent}">`;
            nameElement.innerHTML = `<input id="input-name" class="input" type="text" value="${nameElement.textContent}">`;
            phoneElement.innerHTML = `<input id="input-phone" class="input" type="tel" value="${phoneElement.textContent}">`;
            editButton.style.display = 'none';
            saveButton.style.display = 'inline-block';
            console.log('edit');
        } else {
            emailElement.textContent = document.getElementById('input-email').value;
            nameElement.textContent = document.getElementById('input-name').value;
            phoneElement.textContent = document.getElementById('input-phone').value;
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
            console.log('no edit');
        }
    }

//sendet updateUserInfo zum Server
    async function saveUserinfo() {
        //bekommen upgedatede infos
        const updatedEmail = document.getElementById('input-email').value;
        const updatedName = document.getElementById('input-name').value;
        const updatedPhone = document.getElementById('input-phone').value;

            //sends PUT req to updateInfo
            const response = await fetch('/updateInfo', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: updatedEmail,
                    name: updatedName,
                    phone: updatedPhone
                })
            });

            if (response.ok) {
                console.log('Userinfo saved successfully');
            } else {
                console.error('Failed to save userinfo');
            }
    }
});

