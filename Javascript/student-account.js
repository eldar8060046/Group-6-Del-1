// This script handles all client-side logic for the student-account.html page.

document.addEventListener('DOMContentLoaded', () => {
    // Get user data from local storage, redirect if not a logged-in student.
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    // Get references to all necessary HTML elements.
    const accountForm = document.getElementById('accountForm');
    const passwordForm = document.getElementById('passwordForm');
    const accountMessage = document.getElementById('accountMessage');
    const passwordMessage = document.getElementById('passwordMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle logout button click.
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
    
    // Fetches the student's current account details from the server and populates the form.
    async function fetchAccountDetails() {
        try {
            const response = await fetch(`/account-details?userId=${user.id}&role=student`);
            if (!response.ok) throw new Error('Failed to fetch account');
            const data = await response.json();
            document.getElementById('firstName').value = data.first_name;
            document.getElementById('lastName').value = data.last_name;
            document.getElementById('email').value = data.email;
        } catch (err) {
            accountMessage.textContent = 'Could not load account data.';
            accountMessage.style.color = 'red';
        }
    }

    // Handles submission of the main account details form.
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(accountForm);
        const data = Object.fromEntries(formData.entries());
        data.userId = user.id;
        data.role = 'student';

        try {
            const response = await fetch('/update-account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            accountMessage.textContent = result.message;
            accountMessage.style.color = response.ok ? 'green' : 'red';
        } catch (err) {
            accountMessage.textContent = 'An error occurred.';
            accountMessage.style.color = 'red';
        }
    });

    // Handles submission of the change password form.
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(passwordForm);
        const data = Object.fromEntries(formData.entries());
        data.userId = user.id;
        data.role = 'student';

         try {
            const response = await fetch('/update-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
             passwordMessage.textContent = result.message;
            if (response.ok) {
                passwordMessage.style.color = 'green';
                passwordForm.reset();
            } else {
                passwordMessage.style.color = 'red';
            }
        } catch (err) {
            passwordMessage.textContent = 'An error occurred.';
            passwordMessage.style.color = 'red';
        }
    });
    
    // Fetch the account details when the page loads.
    fetchAccountDetails();
});

