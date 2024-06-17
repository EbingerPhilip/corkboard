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

    async function loadUserProfile(userId) {
        try {
            console.log('Lade Benutzerprofil für:', userId);
            const response = await fetch(`/findUser?UserId=${encodeURIComponent(userId)}`);
            const user = await response.json();
            console.log('Erhaltene Benutzerdaten:', user);

            document.getElementById('profile-username').textContent = user.username;
            emailElement.textContent = user.email;
            nameElement.textContent = user.legalname;
            phoneElement.textContent = user.phone ;
            profilePicture.src = user.profilePicture;
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    loadUserProfile(userId);

    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');

    editButton.addEventListener('click', () => {
        toggleEdit(true);
    });

    saveButton.addEventListener('click', async () => {
        await saveUserinfo();
        toggleEdit(false);
        loadUserProfile(userId);
    });

    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            const formData = new FormData();
            formData.append('profilePicture', file);

            const response = await fetch(`/uploadProfilePicture?userId=${userId}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            profilePicture.src = data.imageUrl;
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
        } else {
            emailElement.textContent = document.getElementById('input-email').value;
            nameElement.textContent = document.getElementById('input-name').value;
            phoneElement.textContent = document.getElementById('input-phone').value;
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
        }
    }

    async function saveUserinfo() {
        const updatedEmail = document.getElementById('input-email').value;
        const updatedName = document.getElementById('input-name').value;
        const updatedPhone = document.getElementById('input-phone').value;

        const updatedUserinfo = {
            userId,
            email: updatedEmail,
            legalname: updatedName,
            phone: updatedPhone,

        };

        console.log('Sending updated info:', updatedUserinfo);

        const response = await fetch('/updateInfo', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUserinfo)
        });

        if (response.ok) {
            console.log('Userinfo saved successfully');
        } else {
            console.error('Failed to save userinfo');
        }
    }
});
