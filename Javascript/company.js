// This script handles all the client-side functionality for the company-dashboard.html page.

document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the necessary HTML elements.
    const createSection = document.getElementById('create-section');
    const editSection = document.getElementById('edit-section');
    const companyInternshipList = document.getElementById('companyInternshipList');
    const postInternshipForm = document.getElementById('postInternshipForm');
    const editInternshipForm = document.getElementById('editInternshipForm');
    const postMessageElement = document.getElementById('postMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const descriptionTextarea = document.getElementById('description');
    const editDescriptionTextarea = document.getElementById('editDescription');
    
    // Retrieve the logged-in user's information from local storage.
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'company') {
        window.location.href = 'login.html';
        return;
    }

    // --- Helper Functions ---

    // A utility to display messages to the user and clear them after 5 seconds.
    function showMessage(message, isError = true) {
        postMessageElement.textContent = message;
        postMessageElement.style.color = isError ? 'red' : 'green';
        setTimeout(() => { postMessageElement.textContent = '' }, 5000);
    }
    
    // Automatically expands a textarea's height to fit its content.
    const autoExpand = (textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    };

    // Switches the view to show the main dashboard (create form and internship list).
    function showMainView() {
        createSection.style.display = 'block';
        editSection.style.display = 'none';
        document.getElementById('companyInternshipList').parentElement.style.display = 'block';
    }

    // Switches the view to show the "Edit Internship" form.
    function showEditView() {
        createSection.style.display = 'none';
        editSection.style.display = 'block';
        document.getElementById('companyInternshipList').parentElement.style.display = 'none';
    }
    
    // --- Event Listeners ---

    // Logout functionality.
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
    
    // Cancel button on the edit form returns to the main view.
    cancelEditBtn.addEventListener('click', showMainView);

    // Event listeners for the auto-expanding textareas.
    descriptionTextarea.addEventListener('input', () => autoExpand(descriptionTextarea));
    editDescriptionTextarea.addEventListener('input', () => autoExpand(editDescriptionTextarea));

    // Handles the submission of the "Post a New Internship" form.
    postInternshipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(postInternshipForm).entries());
        data.companyId = user.id;

        try {
            const response = await fetch('/internships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message, false);
                postInternshipForm.reset();
                fetchCompanyData(); // Refresh the list of internships.
            } else {
                showMessage(result.message);
            }
        } catch (err) {
            showMessage('An error occurred while posting.');
        }
    });

    // Handles the submission of the "Edit Internship" form.
    editInternshipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(editInternshipForm).entries());
        const internshipId = data.internshipId;

        try {
            const response = await fetch(`/internships/${internshipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                showMainView();
                fetchCompanyData();
            } else {
                const result = await response.json();
                showMessage(`Error updating internship: ${result.message}`);
            }
        } catch (err) {
            showMessage('An error occurred while applying changes.');
        }
    });

    // Uses event delegation to handle clicks on Edit, Delete, and View Applicants buttons.
    companyInternshipList.addEventListener('click', async (e) => {
        const target = e.target;
        const internshipId = target.dataset.internshipId;
        if (!internshipId) return;

        // Handle "Edit" button click
        if (target.classList.contains('edit-btn')) {
            try {
                const response = await fetch(`/internship-details/${internshipId}`);
                if (!response.ok) throw new Error('Failed to fetch details');
                const internship = await response.json();
                
                // Populate the edit form with the fetched data.
                document.getElementById('editInternshipId').value = internship.internship_id;
                document.getElementById('editTitle').value = internship.title;
                document.getElementById('editLocation').value = internship.location;
                document.getElementById('editDescription').value = internship.description;
                document.getElementById('editType').value = internship.type;
                document.getElementById('editSkillsRequired').value = internship.skills_required;
                document.getElementById('editSalary').value = internship.salary;
                document.getElementById('editDuration').value = internship.duration;
                // Dates need to be formatted as YYYY-MM-DD for the date input.
                document.getElementById('editDeadline').value = new Date(internship.deadline).toISOString().split('T')[0];
                
                showEditView();
                autoExpand(document.getElementById('editDescription'));
            } catch(err) {
                showMessage('Could not load internship details for editing.');
            }
        }

        // Handle "Delete" button click
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this internship? This will also remove all associated applications.')) {
                try {
                    const response = await fetch(`/internships/${internshipId}`, { method: 'DELETE' });
                    if (response.ok) {
                        fetchCompanyData(); // Refresh the list.
                    } else {
                        const result = await response.json();
                        showMessage(`Error: ${result.message}`);
                    }
                } catch (err) {
                    showMessage('An error occurred while deleting.');
                }
            }
        }
        
        // Handle "View Applicants" button click
        if(target.classList.contains('view-applicants-btn')) {
            window.location.href = `view-applicants.html?internshipId=${internshipId}`;
        }
    });

    // --- Data Fetching and Rendering ---
    async function fetchCompanyData() {
        try {
            const response = await fetch(`/company-internships?companyId=${user.id}`);
            const internships = await response.json();
            companyInternshipList.innerHTML = '';
            if (internships.length === 0) {
                companyInternshipList.innerHTML = '<p>You have not posted any internships yet.</p>';
            } else {
                internships.forEach(internship => {
                    const card = document.createElement('div');
                    card.className = 'internship-card';
                    
                    // Conditionally show the applicant count and "View Applicants" button.
                    let applicantInfoHtml = '';
                    if (internship.applicant_count > 0) {
                        const applicantText = internship.applicant_count === 1 ? '1 Applicant' : `${internship.applicant_count} Applicants`;
                        applicantInfoHtml = `<p><strong>Applicants:</strong> ${applicantText}</p>`;
                    }

                    let viewApplicantsButtonHtml = '';
                    if (internship.applicant_count > 0) {
                        viewApplicantsButtonHtml = `<button class="btn view-applicants-btn" data-internship-id="${internship.internship_id}">View Applicants</button>`;
                    }

                    card.innerHTML = `
                        <h3>${internship.title}</h3>
                        <div class="internship-card-body">
                            <div class="internship-info">
                                <p>
                                    <strong>Location:</strong> <span class="location">${internship.location}</span> | 
                                    <strong>Type:</strong> ${internship.type} | 
                                    <strong>Duration:</strong> ${internship.duration}
                                </p>
                                <p><strong>Salary:</strong> ${internship.salary}</p>
                                <p><strong>Skills Required:</strong> ${internship.skills_required}</p>
                                <p class="description">${internship.description}</p>
                                <p><strong>Apply by:</strong> ${new Date(internship.deadline).toLocaleDateString()}</p>
                                ${applicantInfoHtml}
                            </div>
                            <div class="card-actions">
                                ${viewApplicantsButtonHtml}
                                <button class="btn edit-btn" data-internship-id="${internship.internship_id}">Edit</button>
                                <button class="btn btn-secondary delete-btn" data-internship-id="${internship.internship_id}">Delete</button>
                            </div>
                        </div>
                    `;
                    companyInternshipList.appendChild(card);
                });
            }
        } catch (err) {
            showMessage('Could not fetch your internships.');
        }
    }
    // Initial data fetch and view setup when the page loads.
    fetchCompanyData();
    showMainView();
});

