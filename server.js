const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql');

// Make sure you have run setupDatabase.js first for this to work
const dbConfig = {
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: 'admin', // Your MySQL password
    database: 'internship_db'
};

// Create a connection pool to the database for efficiency
const db = mysql.createPool(dbConfig);

// --- Server Creation ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    const method = req.method;

    // Direct root requests to the main home page
    if (pathname === '/') {
        pathname = '/HTML/home.html';
    }

    // Determine if the request is for an API endpoint or a static file
    const isApiRequest = !path.extname(pathname);

    if (isApiRequest) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const data = body ? JSON.parse(body) : (parsedUrl.query || {});
            handleApiRequest(pathname, method, data, res, req); // Pass req for url parsing
        });
    } else {
        serveStaticFile(pathname, res);
    }
});

// --- API Request Handler ---
function handleApiRequest(pathname, method, data, res, req) {
    res.setHeader('Content-Type', 'application/json');
    const parsedUrl = url.parse(req.url, true);

    // --- Authentication & Profile ---
    if (pathname === '/signup-student' && method === 'POST') {
        const { firstName, lastName, email, password } = data;
        const query = 'INSERT INTO students (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
        db.query(query, [firstName, lastName, email, password], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'This email address is already registered.' });
                return sendResponse(res, 400, { message: 'Invalid data provided.' });
            }
            sendResponse(res, 201, { message: 'Student registered successfully!' });
        });
    } else if (pathname === '/signup-company' && method === 'POST') {
        const { companyName, email, password } = data;
        const query = 'INSERT INTO companies (company_name, email, password) VALUES (?, ?, ?)';
        db.query(query, [companyName, email, password], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'This email address is already registered.' });
                return sendResponse(res, 400, { message: 'Invalid data provided.' });
            }
            sendResponse(res, 201, { message: 'Company registered successfully!' });
        });
    } else if (pathname === '/login' && method === 'POST') {
        const { email, password, role } = data;
        const table = role === 'student' ? 'students' : 'companies';
        const id_field = role === 'student' ? 'student_id' : 'company_id';
        const query = `SELECT * FROM ${table} WHERE email = ? AND password = ?`;

        db.query(query, [email, password], (err, results) => {
            if (err || results.length === 0) return sendResponse(res, 401, { message: 'Invalid email or password.' });
            const user = { id: results[0][id_field], email: results[0].email, role };
            const redirectUrl = role === 'student' ? '/HTML/student-dashboard.html' : '/HTML/company-dashboard.html';
            sendResponse(res, 200, { message: 'Login successful', user, redirectUrl });
        });
    } else if (pathname === '/account-details' && method === 'GET') {
        const { userId, role } = parsedUrl.query;
        const table = role === 'student' ? 'students' : 'companies';
        const idField = role === 'student' ? 'student_id' : 'company_id';
        const query = `SELECT * FROM ${table} WHERE ${idField} = ?`;
        db.query(query, [userId], (err, results) => {
            if (err || results.length === 0) return sendResponse(res, 404, { message: 'Account not found.' });
            res.end(JSON.stringify(results[0]));
        });
    } else if (pathname === '/update-account' && method === 'PUT') {
        const { userId, role, email, companyName, firstName, lastName } = data;
        const table = role === 'student' ? 'students' : 'companies';
        const idField = role === 'student' ? 'student_id' : 'company_id';
        let query, params;
        if (role === 'company') {
            query = `UPDATE ${table} SET company_name = ?, email = ? WHERE ${idField} = ?`;
            params = [companyName, email, userId];
        } else {
            query = `UPDATE ${table} SET first_name = ?, last_name = ?, email = ? WHERE ${idField} = ?`;
            params = [firstName, lastName, email, userId];
        }
        db.query(query, params, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'This email is already in use.' });
                return sendResponse(res, 500, { message: 'Failed to update account.' });
            }
            sendResponse(res, 200, { message: 'Account updated successfully.' });
        });
    } else if (pathname === '/update-password' && method === 'PUT') {
        const { userId, role, oldPassword, newPassword } = data;
        const table = role === 'student' ? 'students' : 'companies';
        const idField = role === 'student' ? 'student_id' : 'company_id';
        
        const selectQuery = `SELECT password FROM ${table} WHERE ${idField} = ?`;
        db.query(selectQuery, [userId], (err, results) => {
            if (err || results.length === 0) return sendResponse(res, 404, { message: 'User not found.' });
            if (results[0].password !== oldPassword) return sendResponse(res, 403, { message: 'Incorrect old password.' });

            const updateQuery = `UPDATE ${table} SET password = ? WHERE ${idField} = ?`;
            db.query(updateQuery, [newPassword, userId], (err, result) => {
                if (err) return sendResponse(res, 500, { message: 'Failed to update password.' });
                sendResponse(res, 200, { message: 'Password updated successfully.' });
            });
        });
    }

    // --- Internship Actions ---
    else if (pathname === '/internships' && method === 'GET') {
        const { title, company, skills, location, type, salary } = parsedUrl.query;
        let query = 'SELECT i.*, c.company_name FROM internships i JOIN companies c ON i.company_id = c.company_id';
        const conditions = [];
        const params = [];

        if (title) {
            conditions.push('i.title LIKE ?');
            params.push(`%${title}%`);
        }
        if (company) {
            conditions.push('c.company_name LIKE ?');
            params.push(`%${company}%`);
        }
        if (skills) {
            conditions.push('i.skills_required LIKE ?');
            params.push(`%${skills}%`);
        }
        if (location) {
            conditions.push('i.location LIKE ?');
            params.push(`%${location}%`);
        }
        if (type) {
            conditions.push('i.type = ?');
            params.push(type);
        }
        if (salary) {
            conditions.push('i.salary LIKE ?');
            params.push(`%${salary}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY i.posted_at DESC';

        db.query(query, params, (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            res.end(JSON.stringify(results));
        });

    } else if (pathname === '/internships' && method === 'POST') {
        const { title, description, location, companyId, type, skills_required, salary, duration, deadline } = data;
        const query = 'INSERT INTO internships (title, description, location, company_id, type, skills_required, salary, duration, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [title, description, location, companyId, type, skills_required, salary, duration, deadline], (err) => {
            if (err) {
                console.error("Error posting internship:", err);
                return sendResponse(res, 500, { message: 'Failed to post internship. Check server logs.' });
            }
            sendResponse(res, 201, { message: 'Internship posted.' });
        });
    } else if (pathname.startsWith('/internships/') && method === 'PUT') {
        const internshipId = pathname.split('/')[2];
        const { title, description, location, type, skills_required, salary, duration, deadline } = data;
        const query = 'UPDATE internships SET title = ?, description = ?, location = ?, type = ?, skills_required = ?, salary = ?, duration = ?, deadline = ? WHERE internship_id = ?';
        db.query(query, [title, description, location, type, skills_required, salary, duration, deadline, internshipId], (err, result) => {
            if (err) {
                console.error("Error updating internship:", err);
                return sendResponse(res, 500, { message: 'Failed to update internship. Check server logs.' });
            }
            if (result.affectedRows === 0) return sendResponse(res, 404, { message: 'Internship not found.' });
            sendResponse(res, 200, { message: 'Internship updated successfully.' });
        });
    } else if (pathname.startsWith('/internships/') && method === 'DELETE') {
        const internshipId = pathname.split('/')[2];
        const deleteAppsQuery = 'DELETE FROM applications WHERE internship_id = ?';
        db.query(deleteAppsQuery, [internshipId], (err) => {
            if (err) return sendResponse(res, 500, { message: 'Failed to delete applications.' });
            const deleteInternshipQuery = 'DELETE FROM internships WHERE internship_id = ?';
            db.query(deleteInternshipQuery, [internshipId], (err, result) => {
                if (err) return sendResponse(res, 500, { message: 'Failed to delete internship.' });
                if (result.affectedRows === 0) return sendResponse(res, 404, { message: 'Internship not found.' });
                sendResponse(res, 200, { message: 'Internship deleted successfully.' });
            });
        });
    } else if (pathname.startsWith('/internship-details/') && method === 'GET') {
        const internshipId = pathname.split('/')[2];
        const query = 'SELECT * FROM internships WHERE internship_id = ?';
        db.query(query, [internshipId], (err, results) => {
            if (err || results.length === 0) return sendResponse(res, 404, { message: 'Internship details not found.' });
            res.end(JSON.stringify(results[0]));
        });
    }
    
    // --- Data Fetching & Application Management Endpoints ---
     else if (pathname === '/company-internships' && method === 'GET') {
        const companyId = parsedUrl.query.companyId;
        const query = `
            SELECT i.*, COUNT(a.application_id) AS applicant_count
            FROM internships i
            LEFT JOIN applications a ON i.internship_id = a.internship_id
            WHERE i.company_id = ?
            GROUP BY i.internship_id
            ORDER BY i.posted_at DESC`;
        db.query(query, [companyId], (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            res.end(JSON.stringify(results));
        });
    } else if (pathname.startsWith('/internship/') && pathname.endsWith('/applications') && method === 'GET') {
        const internshipId = pathname.split('/')[2];
        const getTitleQuery = 'SELECT title FROM internships WHERE internship_id = ?';
        db.query(getTitleQuery, [internshipId], (err, titleResults) => {
            if (err || titleResults.length === 0) return sendResponse(res, 404, { message: 'Internship not found' });
            const internshipTitle = titleResults[0].title;

            const getAppsQuery = `
                SELECT a.application_id, a.status, s.first_name, s.last_name, s.email as student_email, a.application_date 
                FROM applications a
                JOIN students s ON a.student_id = s.student_id
                WHERE a.internship_id = ? 
                ORDER BY a.application_date DESC`;
            db.query(getAppsQuery, [internshipId], (err, appResults) => {
                if (err) return sendResponse(res, 500, { message: 'Database error fetching applications.' });
                const finalData = {
                    internshipTitle,
                    applications: appResults.map(r => ({ ...r, student_name: `${r.first_name} ${r.last_name}` }))
                };
                res.end(JSON.stringify(finalData));
            });
        });
    } else if (pathname.startsWith('/applications/') && pathname.endsWith('/status') && method === 'PUT') {
        const applicationId = pathname.split('/')[2];
        const { status } = data;

        const allowedStatuses = ['Shortlisted', 'Accepted', 'Rejected'];
        if (!allowedStatuses.includes(status)) {
            return sendResponse(res, 400, { message: 'Invalid status provided.' });
        }

        const query = 'UPDATE applications SET status = ? WHERE application_id = ?';
        db.query(query, [status, applicationId], (err, result) => {
            if (err) return sendResponse(res, 500, { message: 'Failed to update status.' });
            sendResponse(res, 200, { message: 'Status updated.' });
        });
    } else if (pathname === '/student-applications' && method === 'GET') {
        const studentId = parsedUrl.query.studentId;
        const query = `
            SELECT a.internship_id, a.status, i.*, c.company_name 
            FROM applications a 
            JOIN internships i ON a.internship_id = i.internship_id 
            JOIN companies c ON i.company_id = c.company_id 
            WHERE a.student_id = ?`;
        db.query(query, [studentId], (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            res.end(JSON.stringify(results));
        });
    } else if (pathname === '/apply' && method === 'POST') {
        const { internshipId, studentId } = data;
        const query = 'INSERT INTO applications (internship_id, student_id) VALUES (?, ?)';
        db.query(query, [internshipId, studentId], (err, result) => {
            if (err) {
                 if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'You have already applied for this internship.' });
                return sendResponse(res, 500, { message: 'Failed to apply.' });
            }
            sendResponse(res, 201, { message: 'Application successful.' });
        });
    } else if (pathname.startsWith('/withdraw/') && method === 'DELETE') {
        const internshipId = pathname.split('/')[2];
        const { studentId } = parsedUrl.query;
        const query = 'DELETE FROM applications WHERE internship_id = ? AND student_id = ?';
        db.query(query, [internshipId, studentId], (err, result) => {
            if (err) return sendResponse(res, 500, { message: 'Failed to withdraw application.' });
            if (result.affectedRows === 0) return sendResponse(res, 404, { message: 'Application not found.' });
            sendResponse(res, 200, { message: 'Application withdrawn.' });
        });
    }
    else {
        sendResponse(res, 404, { message: 'API endpoint not found.' });
    }
}

// --- Static File Serving Helper ---
function serveStaticFile(pathname, res) {
    const filePath = path.join(__dirname, pathname);
    
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (ext) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'application/javascript'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`File not found: ${filePath}`); // For debugging
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// --- General Response Helper ---
function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
}


// --- Start Server ---
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

