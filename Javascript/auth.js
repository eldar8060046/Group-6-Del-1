// This file handles client-side logic for both the login.html and signup.html pages.

document.addEventListener('DOMContentLoaded', () => {
    // --- SIGNUP PAGE LOGIC ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Get references to all the form elements.
        const roleSelector = document.getElementById('role');
        const studentFields = document.getElementById('studentFields');
        const companyFields = document.getElementById('companyFields');
        const messageElement = document.getElementById('message');
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const companyNameInput = document.getElementById('companyName');

        // This function shows or hides form fields based on the selected role (Student or Company).
        const toggleFields = () => {
            if (roleSelector.value === 'student') {
                studentFields.style.display = 'block';
                companyFields.style.display = 'none';
                // Student fields are required, company fields are not.
                firstNameInput.required = true;
                lastNameInput.required = true;
                companyNameInput.required = false;
            } else {
                studentFields.style.display = 'none';
                companyFields.style.display = 'block';
                // Company field is required, student fields are not.
                firstNameInput.required = false;
                lastNameInput.required = false;
                companyNameInput.required = true;
            }
        };

        // Add an event listener to run the toggle function whenever the dropdown is changed.
        roleSelector.addEventListener('change', toggleFields);
        // Run the function once on page load to set the initial state.
        toggleFields();

        // Handle the form submission event.
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the default browser form submission.
            
            // Collect all form data into a simple object.
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());
            const role = data.role;
            
            // Determine the correct API endpoint based on the selected role.
            const endpoint = role === 'student' ? '/signup-student' : '/signup-company';

            try {
                // Send the form data to the server using the Fetch API.
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                
                // Display the server's response message to the user.
                messageElement.textContent = result.message;
                if (response.ok) {
                    messageElement.style.color = 'green';
                    signupForm.reset();
                    toggleFields(); // Reset fields to default visibility.
                } else {
                    messageElement.style.color = 'red';
                }
            } catch (err) {
                // Handle network errors.
                messageElement.textContent = 'An error occurred. Please try again.';
                messageElement.style.color = 'red';
            }
        });
    }

    // --- LOGIN PAGE LOGIC ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const messageElement = document.getElementById('message');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (response.ok) {
                    // On successful login, save user info to the browser's local storage.
                    localStorage.setItem('user', JSON.stringify(result.user));
                    // Redirect the user to their appropriate dashboard.
                    window.location.href = result.redirectUrl; 
                } else {
                    messageElement.textContent = result.message;
                    messageElement.style.color = 'red';
                }
            } catch (err) {
                messageElement.textContent = 'An error occurred. Please try again.';
                messageElement.style.color = 'red';
            }
        });
    }
});

