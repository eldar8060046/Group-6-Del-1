// This script handles all client-side logic for the view-applicants.html page.

document.addEventListener('DOMContentLoaded', () => {
    // Get references to all necessary HTML elements.
    const applicationList = document.getElementById('applicationList');
    const internshipTitle = document.getElementById('internshipTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const applicantSearchInput = document.getElementById('applicant-search');
    
    // This variable will hold the master list of applicants to filter from.
    let allApplications = []; 

    // Get the internship ID from the URL to know which applicants to fetch.
    const urlParams = new URLSearchParams(window.location.search);
    const internshipId = urlParams.get('internshipId');

    if (!internshipId) {
        applicationList.innerHTML = '<p>No internship specified.</p>';
        return;
    }

    // Handle logout button click.
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Fetches all applicants for the specified internship.
    async function fetchApplicants() {
        try {
            const response = await fetch(`/internship/${internshipId}/applications`);
            if (!response.ok) throw new Error('Failed to fetch applicants.');
            
            const data = await response.json();
            internshipTitle.textContent = `Applicants for "${data.internshipTitle}"`;
            allApplications = data.applications || [];
            renderApplicants(allApplications); // Render the full list initially.

        } catch (err) {
            applicationList.innerHTML = `<p>Error loading applications: ${err.message}</p>`;
        }
    }

    // Renders a list of application cards to the page.
    function renderApplicants(applicantsToRender) {
        applicationList.innerHTML = ''; 
        if (applicantsToRender.length === 0) {
            applicationList.innerHTML = '<p>No applications match your search or none have been received yet.</p>';
            return;
        }

        applicantsToRender.forEach(app => {
            const card = document.createElement('div');
            card.className = 'application-card';
            card.innerHTML = `
                <h3>${app.student_name}</h3>
                <p><strong>Email:</strong> ${app.student_email}</p>
                <p><strong>Applied on:</strong> ${new Date(app.application_date).toLocaleDateString()}</p>
                <div class="form-group">
                    <label for="status-select-${app.application_id}">Status: </label>
                    <select class="status-select" data-application-id="${app.application_id}">
                        <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                        <option value="Accepted" ${app.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                        <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
            `;
            applicationList.appendChild(card);
        });
    }

    // Filters the rendered applicants in real-time as the company types a name.
    applicantSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredApplications = allApplications.filter(app => 
            app.student_name.toLowerCase().includes(searchTerm)
        );
        renderApplicants(filteredApplications);
    });
    
    // Updates the application status in the database when a new status is selected.
    applicationList.addEventListener('change', async (e) => {
        if(e.target.classList.contains('status-select')) {
            const applicationId = e.target.dataset.applicationId;
            const newStatus = e.target.value;

            try {
                const response = await fetch(`/applications/${applicationId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({ status: newStatus })
                });
                if(!response.ok) {
                    // In a real app, you might show a more specific error message here.
                    console.error('Failed to update status.');
                }
            } catch (err) {
                console.error('An error occurred while updating status.');
            }
        }
    });

    // Fetch the applicants when the page loads.
    fetchApplicants();
});

