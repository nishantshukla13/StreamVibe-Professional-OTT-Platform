<<<<<<< HEAD
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route to fix "Cannot GET /" on Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// TiDB Cloud Connection using Environment Variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 4000,
    ssl: {
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to TiDB Cloud Database successfully!');
});

// API: Admin Login Verification
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    db.query("SELECT * FROM admin_settings WHERE id = 1", (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (results[0].password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.json({ success: false, message: 'Incorrect password!' });
        }
    });
});

// API: Change Admin Password
app.post('/api/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    db.query("SELECT * FROM admin_settings WHERE id = 1", (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (results[0].password === oldPassword) {
            db.query("UPDATE admin_settings SET password = ? WHERE id = 1", [newPassword], (updateErr) => {
                if (updateErr) return res.status(500).json({ success: false, message: 'Failed to update' });
                res.json({ success: true, message: 'Password changed successfully!' });
            });
        } else {
            res.json({ success: false, message: 'Old password is incorrect!' });
        }
    });
});

// API: Upload Content (Supports Direct Link & Embed Link)
app.post('/api/upload-content', (req, res) => {
    const { title, category, poster_url, banner_url, uploadType, direct_link, embed_link } = req.body;
    let mediaLink = "";
    let embedLinkVal = "";

    if (uploadType === 'link') {
        mediaLink = direct_link || "";
    } else if (uploadType === 'embed') {
        embedLinkVal = embed_link || "";
    } else {
        return res.status(400).json({ success: false, message: 'No video link or embed code provided!' });
    }

    const query = "INSERT INTO movies (title, category, poster_url, banner_url, drive_link, embed_link) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(query, [title, category, poster_url, banner_url || '', mediaLink, embedLinkVal], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        res.json({ success: true, message: 'Content uploaded successfully!' });
    });
});

// API: Fetch Movies
app.get('/api/movies', (req, res) => {
    db.query("SELECT * FROM movies ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// API: Update Movie
app.put('/api/update-movie/:id', (req, res) => {
    const movieId = req.params.id;
    const { title, category, poster_url, banner_url, direct_link, embed_link } = req.body;
    const query = "UPDATE movies SET title = ?, category = ?, poster_url = ?, banner_url = ?, drive_link = ?, embed_link = ? WHERE id = ?";
    db.query(query, [title, category, poster_url, banner_url || '', direct_link || '', embed_link || '', movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Movie updated successfully!' });
    });
});

// API: Delete Movie
app.delete('/api/delete-movie/:id', (req, res) => {
    const movieId = req.params.id;
    db.query("DELETE FROM movies WHERE id = ?", [movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Movie deleted successfully!' });
    });
});

// Local Development Server & Vercel Serverless Export Setup
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

=======
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route to fix "Cannot GET /" on Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// TiDB Cloud Connection using Environment Variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 4000,
    ssl: {
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to TiDB Cloud Database successfully!');
});

// API: Admin Login Verification
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    db.query("SELECT * FROM admin_settings WHERE id = 1", (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (results[0].password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.json({ success: false, message: 'Incorrect password!' });
        }
    });
});

// API: Change Admin Password
app.post('/api/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    db.query("SELECT * FROM admin_settings WHERE id = 1", (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (results[0].password === oldPassword) {
            db.query("UPDATE admin_settings SET password = ? WHERE id = 1", [newPassword], (updateErr) => {
                if (updateErr) return res.status(500).json({ success: false, message: 'Failed to update' });
                res.json({ success: true, message: 'Password changed successfully!' });
            });
        } else {
            res.json({ success: false, message: 'Old password is incorrect!' });
        }
    });
});

// API: Upload Content (Supports Direct Link & Embed Link)
app.post('/api/upload-content', (req, res) => {
    const { title, category, poster_url, banner_url, uploadType, direct_link, embed_link } = req.body;
    let mediaLink = "";
    let embedLinkVal = "";

    if (uploadType === 'link') {
        mediaLink = direct_link || "";
    } else if (uploadType === 'embed') {
        embedLinkVal = embed_link || "";
    } else {
        return res.status(400).json({ success: false, message: 'No video link or embed code provided!' });
    }

    const query = "INSERT INTO movies (title, category, poster_url, banner_url, drive_link, embed_link) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(query, [title, category, poster_url, banner_url || '', mediaLink, embedLinkVal], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        res.json({ success: true, message: 'Content uploaded successfully!' });
    });
});

// API: Fetch Movies
app.get('/api/movies', (req, res) => {
    db.query("SELECT * FROM movies ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// API: Update Movie
app.put('/api/update-movie/:id', (req, res) => {
    const movieId = req.params.id;
    const { title, category, poster_url, banner_url, direct_link, embed_link } = req.body;
    const query = "UPDATE movies SET title = ?, category = ?, poster_url = ?, banner_url = ?, drive_link = ?, embed_link = ? WHERE id = ?";
    db.query(query, [title, category, poster_url, banner_url || '', direct_link || '', embed_link || '', movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Movie updated successfully!' });
    });
});

// API: Delete Movie
app.delete('/api/delete-movie/:id', (req, res) => {
    const movieId = req.params.id;
    db.query("DELETE FROM movies WHERE id = ?", [movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Movie deleted successfully!' });
    });
});

// Local Development Server & Vercel Serverless Export Setup
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

>>>>>>> 6ff66d285a1e66643aa2bcbb27f0603f07f9ac69
module.exports = app;