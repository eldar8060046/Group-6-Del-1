// A simple Node.js server using only built-in modules and the 'mysql' package.
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql');

// Connect to MySQL Database
// Make sure you have run setupDatabase.js first.
const dbConfig = {
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: 'admin', // Your MySQL password
    database: 'internship_db'
};

const db = mysql.createPool(dbConfig);

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    const method = req.method;

    if (pathname === '/') {
        pathname = '/HTML/home.html';
    }

    const isApiRequest = !path.extname(pathname);

    if (isApiRequest) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const data = body ? JSON.parse(body) : (parsedUrl.query || {});
            handleApiRequest(pathname, method, data, res, req);
        });
    } else {
        serveStaticFile(pathname, res);
    }
});

function handleApiRequest(pathname, method, data, res, req) {
    res.setHeader('Content-Type', 'application/json');
    const parsedUrl = url.parse(req.url, true);

    // --- User and Company Authentication Endpoints ---
    if (pathname === '/signup-student' && method === 'POST') {
        const { firstName, lastName, email, password } = data;
        const query = 'INSERT INTO students (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
        db.query(query, [firstName, lastName, email, password], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'This email address is already registered.' });
                return sendResponse(res, 400, { message: 'Invalid data provided.' });
            }
            sendResponse(res, 201, { message: 'Student registered successfully!' });
        });
    } else if (pathname === '/signup-company' && method === 'POST') {
        const { companyName, email, password } = data;
        const query = 'INSERT INTO companies (company_name, email, password) VALUES (?, ?, ?)';
        db.query(query, [companyName, email, password], (err) => {
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
            const redirectUrl = role === 'student' ? 'student-dashboard.html' : 'company-dashboard.html';
            sendResponse(res, 200, { message: 'Login successful', user, redirectUrl });
        });
    }
    
    // --- Internship and Application Endpoints ---
    else if (pathname === '/internships' && method === 'GET') {
        const query = 'SELECT i.*, c.company_name FROM internships i JOIN companies c ON i.company_id = c.company_id ORDER BY i.posted_at DESC';
        db.query(query, (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            res.end(JSON.stringify(results));
        });
    } else if (pathname === '/internships' && method === 'POST') {
        const { title, description, location, companyId, type, skills_required, salary, duration, deadline } = data;
        const query = 'INSERT INTO internships (title, description, location, company_id, type, skills_required, salary, duration, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [title, description, location, companyId, type, skills_required, salary, duration, deadline], (err) => {
            if (err) {
                console.error("Error posting internship:", err); // Added for debugging
                return sendResponse(res, 500, { message: 'Failed to post internship. Check server logs for details.' });
            }
            sendResponse(res, 201, { message: 'Internship posted.' });
        });
    } else if (pathname.startsWith('/internships/') && method === 'PUT') {
        const internshipId = pathname.split('/')[2];
        const { title, description, location, type, skills_required, salary, duration, deadline } = data;
        const query = 'UPDATE internships SET title = ?, description = ?, location = ?, type = ?, skills_required = ?, salary = ?, duration = ?, deadline = ? WHERE internship_id = ?';
        db.query(query, [title, description, location, type, skills_required, salary, duration, deadline, internshipId], (err, result) => {
            if (err) {
                console.error("Error updating internship:", err); // Added for debugging
                return sendResponse(res, 500, { message: 'Failed to update internship. Check server logs for details.' });
            }
            if (result.affectedRows === 0) return sendResponse(res, 404, { message: 'Internship not found.' });
            sendResponse(res, 200, { message: 'Internship updated successfully.' });
        });
    } else if (pathname.startsWith('/internships/') && method === 'DELETE') {
        const internshipId = pathname.split('/')[2];
        const deleteAppsQuery = 'DELETE FROM applications WHERE internship_id = ?';
        db.query(deleteAppsQuery, [internshipId], (err, result) => {
            if (err) return sendResponse(res, 500, { message: 'Failed to delete associated applications.' });
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
    
    // --- Data Fetching Endpoints ---
    else if (pathname === '/company-internships' && method === 'GET') {
        const companyId = parsedUrl.query.companyId;
        const query = 'SELECT * FROM internships WHERE company_id = ? ORDER BY posted_at DESC';
        db.query(query, [companyId], (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            res.end(JSON.stringify(results));
        });
    } else if (pathname === '/applications' && method === 'GET') {
        const companyId = parsedUrl.query.companyId;
        const query = `
            SELECT s.first_name, s.last_name, s.email as student_email, i.title as internship_title, a.application_date 
            FROM applications a
            JOIN students s ON a.student_id = s.student_id
            JOIN internships i ON a.internship_id = i.internship_id
            WHERE i.company_id = ? ORDER BY a.application_date DESC`;
        db.query(query, [companyId], (err, results) => {
            if (err) return sendResponse(res, 500, { message: 'Database error.' });
            const finalResults = results.map(r => ({ ...r, student_name: `${r.first_name} ${r.last_name}` }));
            res.end(JSON.stringify(finalResults));
        });
    } else if (pathname === '/apply' && method === 'POST') {
        const { internshipId, studentId } = data;
        const query = 'INSERT INTO applications (internship_id, student_id) VALUES (?, ?)';
        db.query(query, [internshipId, studentId], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, { message: 'You have already applied for this internship.' });
                return sendResponse(res, 500, { message: 'Failed to apply.' });
            }
            sendResponse(res, 201, { message: 'Application successful.' });
        });
    } else {
        sendResponse(res, 404, { message: 'API endpoint not found.' });
    }
}

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
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

