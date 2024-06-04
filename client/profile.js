document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const username = params.get('username');

    const emailElement = document.getElementById('profile-email');
    const nameElement = document.getElementById('profile-name');
    const phoneElement = document.getElementById('profile-phone');


    document.getElementById('profile-username').textContent = username;

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

    saveButton.addEventListener('click', () => {
        toggleEdit(false);


        const updatedEmail = document.getElementById('input-email').value;
        const updatedName = document.getElementById('input-name').value;
        const updatedPhone = document.getElementById('input-phone').value;

        emailElement.textContent = updatedEmail;
        nameElement.textContent = updatedName;
        phoneElement.textContent = updatedPhone;
    });

    function toggleEdit(isEditing) {
        if (isEditing) {
            emailElement.innerHTML = `<input id="input-email" class="input" type="email" value="${emailElement.textContent}">`;
            nameElement.innerHTML = `<input id="input-name" class="input" type="text" value="${nameElement.textContent}">`;
            phoneElement.innerHTML = `<input id="input-phone" class="input" type="tel" value="${phoneElement.textContent}">`;
            editButton.style.display = 'none';
            saveButton.style.display = 'inline-block';
        } else {
            emailElement.textContent = document.getElementById('input-email').value;
            nameElement.textContent = document.getElementById('input-name').value;
            phoneElement.textContent = document.getElementById('input-phone').value;
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
        }
    }
});