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
    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');
    
    //läd Userprofile für angegebene userID
    async function loadUserProfile(userId) {
        try {
            const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`); //fetch Anfrage an findUser
            const user = await response.json();  //parsed JSON-Antwort und speichert Daten in 'user'

            //setzt den Benutzernamen
            document.getElementById('profile-username').textContent = user.username;
            emailElement.textContent = user.email;
            nameElement.textContent = user.legalname;
            phoneElement.textContent = user.phone ;
            profilePicture.src = user.profilePicture;
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    //ruft Funktion und übergibt userID -> Userprofile wird geladen und angezeigt
    loadUserProfile(userId);

    //Wenn Edit gecklickt und man kann bearbeiten
    editButton.addEventListener('click', () => {
        toggleEdit(true);
    });

    //wenn Save geklcikt dann:
    saveButton.addEventListener('click', async () => {
        await saveUserinfo();       //saveUserInfo wird aufgerufen
        toggleEdit(false);  //wechselt zurück in Anzeigemodus
        loadUserProfile(userId);    //aktualisiert UserProfile
    });

    //wenn Upload Button -> FileInput => Benutzer kanm datei auswählen
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    //wenn datei ausgewählt wird dann 'Change' event:
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];             //ausgewählte Datei wird abgerufen
        if (file) {
            //Ein FormData Objekt wird erytellt und Datei hinzugefügt
            const formData = new FormData();
            formData.append('profilePicture', file);

            //POST anfrage um Profilbild hochzuladen
            const response = await fetch(`/uploadProfilePicture?userId=${userId}`, {
                method: 'PUT',
                body: formData
            });

            //Antwort geparsed und Profilbild aktualisiert
            const data = await response.json();
            profilePicture.src = data.imageUrl;
        }
    });


    backButton.addEventListener('click', () => {
        window.location.href = `/index.html?userId=${userId}`;
    });

    function toggleEdit(isEditing) {
        if (isEditing) {
            //ersetzt die 'innerHTMLÄ Elemente mit aktuellen werten
            emailElement.innerHTML = `<input id="input-email" class="input" type="email" value="${emailElement.textContent}">`;
            nameElement.innerHTML = `<input id="input-name" class="input" type="text" value="${nameElement.textContent}">`;
            phoneElement.innerHTML = `<input id="input-phone" class="input" type="tel" value="${phoneElement.textContent}">`;
        } else {
            //aktualisiert Elemente mit Wert aus den Eingabefeldern
            emailElement.textContent = document.getElementById('input-email').value;
            nameElement.textContent = document.getElementById('input-name').value;
            phoneElement.textContent = document.getElementById('input-phone').value;
        }
    }

    //sammelt aktualisierte Benutzerdaten und sendet sie zu Server um zu speichern
    async function saveUserinfo() {
        //abruf der Aktualisierten Werte und sammelt diese
        const updatedEmail = document.getElementById('input-email').value;
        const updatedName = document.getElementById('input-name').value;
        const updatedPhone = document.getElementById('input-phone').value;

        //Objekt UpdateUserInfo erstellt, welches gesammelte Infos enthaltet
        const updatedUserinfo = {
            userId,
            email: updatedEmail,
            legalname: updatedName,
            phone: updatedPhone,
        };

        //sendet aktualisierten Benutzerdaten an Server
        const response = await fetch('/updateInfo', {   //Führt HTTP Anfrage an /updateInfo aus
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUserinfo) //wadnelt updateUserInfo ind ein JSON String um
        });

        if (response.ok) {
            console.log('Userinfo saved successfully');
        } else {
            console.error('Failed to save userinfo');
        }
    }
});
