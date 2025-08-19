const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

// Create a new database connection
const db = new sqlite3.Database(path.join(__dirname, 'firmware.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize the database table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS firmware_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        description TEXT,
        spi_file_path TEXT NOT NULL,
        usb_file_path TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Firmware updates table created or already exists');
        }
    });
});

module.exports = db;
