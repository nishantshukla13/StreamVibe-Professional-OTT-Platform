const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
    user: 'JUDbqCoUMPhxXC9.root',
    password: 'sQzdEABRHN2LHPf6', // Yahan apna TiDB Cloud ka password likh dein
    database: 'test',
    port: 4000,
    ssl: {
        rejectUnauthorized: true
    }
});

const queries = [
    `CREATE TABLE IF NOT EXISTS admin_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        password VARCHAR(255) NOT NULL
    );`,
    `INSERT INTO admin_settings (id, password) VALUES (1, '12345') 
     ON DUPLICATE KEY UPDATE password = '12345';`,
    `CREATE TABLE IF NOT EXISTS movies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        poster_url TEXT NOT NULL,
        banner_url TEXT,
        drive_link TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`
];

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err);
        return;
    }
    console.log('Connected to TiDB Cloud successfully!');

    queries.forEach((query, index) => {
        db.query(query, (err) => {
            if (err) {
                console.error(`Error in query ${index + 1}:`, err);
            } else {
                console.log(`Query ${index + 1} executed successfully!`);
            }
            if (index === queries.length - 1) {
                db.end();
            }
        });
    });
});