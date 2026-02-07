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
    // 创建新表
    db.run(`CREATE TABLE IF NOT EXISTS firmware_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adapter_version TEXT,
        mouse_version TEXT,
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

            // 检查并添加新字段（用于旧版本升级）
            db.all(`PRAGMA table_info(firmware_updates)`, (err, columns) => {
                if (err) {
                    console.error('Error checking columns:', err);
                    return;
                }

                const columnNames = columns.map(col => col.name);

                // 如果缺少 adapter_version 字段，则添加
                if (!columnNames.includes('adapter_version')) {
                    db.run(`ALTER TABLE firmware_updates ADD COLUMN adapter_version TEXT`, (err) => {
                        if (err) {
                            console.error('Error adding adapter_version column:', err);
                        } else {
                            console.log('Added adapter_version column');
                        }
                    });
                }

                // 如果缺少 mouse_version 字段，则添加
                if (!columnNames.includes('mouse_version')) {
                    db.run(`ALTER TABLE firmware_updates ADD COLUMN mouse_version TEXT`, (err) => {
                        if (err) {
                            console.error('Error adding mouse_version column:', err);
                        } else {
                            console.log('Added mouse_version column');
                        }
                    });
                }

                // 如果缺少 force_update 字段，则添加
                if (!columnNames.includes('force_update')) {
                    db.run(`ALTER TABLE firmware_updates ADD COLUMN force_update INTEGER DEFAULT 0`, (err) => {
                        if (err) {
                            console.error('Error adding force_update column:', err);
                        } else {
                            console.log('Added force_update column');
                        }
                    });
                }
            });
        }
    });
});

module.exports = db;
