// This script connects to MySQL and sets up the database and tables.
// Run this file once using 'node setupDatabase.js' from your terminal.

const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

// --- IMPORTANT ---
// Replace these with your actual MySQL connection details.
const dbConfig = {
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: 'admin', // Your MySQL password
    // We connect without specifying a database initially to create it.
};

const dbName = 'internship_db';

// Read the SQL schema from the SQL folder (Path Updated)
const schemaSql = fs.readFileSync(path.join(__dirname, 'SQL', 'schema.sql'), 'utf8');

// Create a connection to the MySQL server
const connection = mysql.createConnection(dbConfig);

// Connect and execute setup commands
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);

    // 1. Create the database if it doesn't exist
    connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`, (err, results) => {
        if (err) {
            console.error('Error creating database:', err);
            connection.end();
            return;
        }
        console.log(`Database '${dbName}' is ready.`);

        // 2. Switch to the newly created database
        connection.changeUser({ database: dbName }, (err) => {
            if (err) {
                console.error(`Error switching to database '${dbName}':`, err);
                connection.end();
                return;
            }

            // 3. Execute the schema.sql file to create all tables
            // The mysql module can execute multiple statements at once if configured.
            const multiStatementConnection = mysql.createConnection({
                ...dbConfig,
                database: dbName,
                multipleStatements: true
            });

            multiStatementConnection.query(schemaSql, (err, results) => {
                if (err) {
                    console.error('Error executing schema SQL:', err);
                } else {
                    console.log('Tables created successfully!');
                }
                multiStatementConnection.end(); // Close this connection
            });
        });
        
        connection.end(); // Close the initial connection
    });
});

