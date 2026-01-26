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
    // 先检查表是否存在，如果存在则更新结构
    db.run(`PRAGMA table_info(firmware_updates)`, (err, rows) => {
        if (err) {
            console.error('Error checking table:', err);
            return;
        }

        // 如果表不存在，创建新表
        db.run(`CREATE TABLE IF NOT EXISTS firmware_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT,
            description TEXT,
            productId TEXT,
            vendorId TEXT,
            productName TEXT,
            spi_file_path TEXT,
            usb_file_path TEXT,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Firmware updates table ready');
            }
        });
    });
});

module.exports = db;
