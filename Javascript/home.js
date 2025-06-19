// This script handles all the dynamic content on the home page (home.html).

document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the HTML elements that need to be manipulated.
    const navLoggedOut = document.getElementById('nav-logged-out');
    const navLoggedIn = document.getElementById('nav-logged-in');
    const dashboardLink = document.getElementById('dashboard-link');
    const accountLink = document.getElementById('account-link');
    const logoutBtn = document.getElementById('logoutBtn');
    const internshipList = document.getElementById('internshipList');
    const messageElement = document.getElementById('home-message');
    const loggedOutContent = document.getElementById('logged-out-content');
    const loggedInContent = document.getElementById('logged-in-content');
    const dashboardBoxLink = document.getElementById('dashboard-box-link');
    const accountBoxLink = document.getElementById('account-box-link');

    // Check if user information is stored in the browser's local storage.
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Main Logic: Control what the user sees based on login status ---
    if (user) {
        // --- LOGGED-IN USER VIEW ---

        // Show the navigation bar for logged-in users.
        navLoggedOut.style.display = 'none';
        navLoggedIn.style.display = 'flex';
        
        // Set the correct links for the dashboard and account pages based on the user's role.
        let dashboardHref, accountHref;
        if (user.role === 'student') {
            dashboardHref = 'HTML/student-dashboard.html';
            accountHref = 'HTML/student-account.html';
        } else if (user.role === 'company') {
            dashboardHref = 'HTML/company-dashboard.html';
            accountHref = 'HTML/company-account.html';
        }
        // Update the href for all relevant links.
        dashboardLink.href = dashboardHref;
        accountLink.href = accountHref;
        dashboardBoxLink.href = dashboardHref;
        accountBoxLink.href = accountHref;

        // Add functionality to the logout button.
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user'); // Clear user data from storage.
            window.location.reload(); // Reload the page to show the logged-out view.
        });
        
        // Show the action boxes (Dashboard/Account) and hide the public internship list.
        loggedInContent.style.display = 'block';
        loggedOutContent.style.display = 'none';

    } else {
        // --- LOGGED-OUT USER VIEW ---

        // Show the navigation bar for logged-out users, ensuring it uses flex display.
        navLoggedOut.style.display = 'flex'; // This line is corrected to apply CSS gap.
        navLoggedIn.style.display = 'none';

        // Show the public internship list and hide the logged-in action boxes.
        loggedInContent.style.display = 'none';
        loggedOutContent.style.display = 'block';
        // Fetch and display the list of all available internships.
        fetchAndRenderInternships();
    }

    // --- Data Fetching and Rendering ---

    // Function to fetch and display all available internships for logged-out users.
    async function fetchAndRenderInternships() {
        try {
            const response = await fetch('/internships');
            if (!response.ok) throw new Error('Could not fetch internships.');
            
            const internships = await response.json();
            internshipList.innerHTML = ''; 

            if (internships.length === 0) {
                internshipList.innerHTML = '<p>No internships are available at the moment. Please check back later.</p>';
                return;
            }

            // Create an HTML card for each internship.
            internships.forEach(internship => {
                const card = document.createElement('div');
                card.className = 'internship-card';

                // The button for a logged-out user always links to the login page.
                const buttonHtml = `<a href="HTML/login.html" class="btn">Login to Apply</a>`;

                card.innerHTML = `
                    <div class="internship-info">
                        <h3>${internship.title}</h3>
                        <p><strong>Company:</strong> ${internship.company_name}</p>
                        <p>
                            <strong>Location:</strong> ${internship.location} | 
                            <strong>Type:</strong> ${internship.type} | 
                            <strong>Duration:</strong> ${internship.duration}
                        </p>
                        <p><strong>Salary:</strong> ${internship.salary}</p>
                        <p><strong>Skills Required:</strong> ${internship.skills_required}</p>
                        <p>${internship.description}</p>
                        <p><strong>Apply by:</strong> ${new Date(internship.deadline).toLocaleDateString()}</p>
                    </div>
                    <div class="card-actions">
                       ${buttonHtml}
                    </div>
                `;
                internshipList.appendChild(card);
            });

        } catch (err) {
            internshipList.innerHTML = `<p>${err.message}</p>`;
        }
    }
});

