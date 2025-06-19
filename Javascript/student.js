// This script handles all the client-side functionality for the student-dashboard.html page.

document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the necessary HTML elements.
    const internshipList = document.getElementById('internshipList');
    const myApplicationsList = document.getElementById('myApplicationsList');
    const logoutBtn = document.getElementById('logoutBtn');
    const messageElement = document.getElementById('dashboard-message');
    const searchForm = document.getElementById('search-form');

    // Retrieve the logged-in user's information from local storage.
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    // A helper function to display messages to the user and clear them after 5 seconds.
    function showMessage(message, isError = true) {
        messageElement.textContent = message;
        messageElement.style.color = isError ? 'red' : 'green';
        setTimeout(() => { messageElement.textContent = '' }, 5000); 
    }

    // Add functionality to the logout button.
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Fetches all necessary data from the server: all internships and the student's personal applications.
    async function fetchAllData() {
        // Construct query parameters from the current form values.
        const formData = new FormData(searchForm);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            if (value) {
                params.append(key, value);
            }
        }
        
        try {
            const [internshipsResponse, applicationsResponse] = await Promise.all([
                fetch(`/internships?${params.toString()}`),
                fetch(`/student-applications?studentId=${user.id}`)
            ]);

            if (!internshipsResponse.ok || !applicationsResponse.ok) {
                throw new Error('Failed to fetch data.');
            }

            const allInternships = await internshipsResponse.json();
            const myApplications = await applicationsResponse.json();
            
            const appliedInternshipIds = new Set(myApplications.map(app => app.internship_id));

            renderInternships(allInternships, appliedInternshipIds);
            renderMyApplications(myApplications);

        } catch (err) {
            showMessage('Could not fetch page data. Please refresh.');
        }
    }
    
    // Renders the list of available internships that the student has NOT applied for.
    function renderInternships(internships, appliedIds) {
        internshipList.innerHTML = '';
        const availableInternships = internships.filter(intern => !appliedIds.has(intern.internship_id));
        
        if (availableInternships.length === 0) {
            internshipList.innerHTML = '<p>No internships found matching your criteria.</p>';
            return;
        }

        availableInternships.forEach(internship => {
            const card = document.createElement('div');
            card.className = 'internship-card';
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
                   <button class="btn apply-btn" data-internship-id="${internship.internship_id}">Apply</button>
                </div>
            `;
            internshipList.appendChild(card);
        });
    }

    // Renders the list of internships the student HAS applied for.
    function renderMyApplications(applications) {
        myApplicationsList.innerHTML = '';
        if (applications.length === 0) {
            myApplicationsList.innerHTML = '<p>You have not applied to any internships yet.</p>';
            return;
        }

        applications.forEach(app => {
            const card = document.createElement('div');
            card.className = 'application-card';
            card.innerHTML = `
                <div class="application-info">
                    <h3>${app.title}</h3>
                    <p><strong>Company:</strong> ${app.company_name}</p>
                     <p>
                        <strong>Location:</strong> ${app.location} | 
                        <strong>Type:</strong> ${app.type} | 
                        <strong>Duration:</strong> ${app.duration}
                    </p>
                    <p><strong>Salary:</strong> ${app.salary}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span></p>
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary withdraw-btn" data-internship-id="${app.internship_id}">Withdraw</button>
                </div>
            `;
            myApplicationsList.appendChild(card);
        });
    }
    
    // --- Event Listeners ---

    // Listen for any input on the search form to trigger a real-time filter.
    searchForm.addEventListener('input', () => {
        fetchAllData();
    });

    // A single event listener on the parent lists to handle apply/withdraw clicks.
    async function handleAction(e) {
        const target = e.target;
        const internshipId = target.dataset.internshipId;
        if (!internshipId) return;

        // Handle Apply button click
        if (target.classList.contains('apply-btn')) {
            try {
                const response = await fetch('/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ internshipId, studentId: user.id }),
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage('Application successful!', false);
                    fetchAllData(); // Refresh all lists
                } else {
                    showMessage(`Error: ${result.message}`);
                }
            } catch (err) {
                showMessage('An error occurred while applying.');
            }
        }

        // Handle Withdraw button click
        if (target.classList.contains('withdraw-btn')) {
             if (confirm('Are you sure you want to withdraw your application?')) {
                try {
                    const response = await fetch(`/withdraw/${internshipId}?studentId=${user.id}`, { 
                        method: 'DELETE' 
                    });
                    if (response.ok) {
                        showMessage('Application withdrawn successfully.', false);
                        fetchAllData(); // Refresh all lists
                    } else {
                        const result = await response.json();
                        showMessage(`Error withdrawing application: ${result.message}`);
                    }
                } catch (err) {
                    showMessage('An error occurred while withdrawing.');
                }
            }
        }
    }

    internshipList.addEventListener('click', handleAction);
    myApplicationsList.addEventListener('click', handleAction);
    
    // Initial data fetch when the page loads.
    fetchAllData();
});

