const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const axios = require('axios');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route to fix root route on Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// TiDB Cloud Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: Number(process.env.DB_PORT || 4000),
    ssl: {
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// API: Proxy Stream Route to Bypass Hotlinking/Headers/CORS
app.get('/api/proxy-stream', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    try {
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': new URL(videoUrl).origin
            },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        response.data.pipe(res);
    } catch (error) {
        console.error("Proxy streaming error:", error.message);
        res.status(500).send('Failed to stream video via proxy');
    }
});

// API: Admin Login Verification
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    db.query("SELECT * FROM admin_settings WHERE id = 1", (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: 'Admin settings not found' });
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
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: 'Admin settings not found' });
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

// API: Upload Content
app.post('/api/upload-content', (req, res) => {
    const { title, category, poster_url, banner_url, uploadType, drive_link, embed_link } = req.body;
    let mediaLink = "";
    let embedLinkVal = "";

    if (uploadType === 'link') {
        mediaLink = drive_link || "";
    } else if (uploadType === 'embed') {
        embedLinkVal = embed_link || "";
    } else {
        mediaLink = drive_link || "";
        embedLinkVal = embed_link || "";
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
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        res.json(results);
    });
});

// API: Update Movie
app.put('/api/update-movie/:id', (req, res) => {
    const movieId = req.params.id;
    const { title, category, poster_url, banner_url, drive_link, embed_link } = req.body;
    const query = "UPDATE movies SET title = ?, category = ?, poster_url = ?, banner_url = ?, drive_link = ?, embed_link = ? WHERE id = ?";
    db.query(query, [title, category, poster_url, banner_url || '', drive_link || '', embed_link || '', movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        res.json({ success: true, message: 'Movie updated successfully!' });
    });
});

// API: Delete Movie
app.delete('/api/delete-movie/:id', (req, res) => {
    const movieId = req.params.id;
    db.query("DELETE FROM movies WHERE id = ?", [movieId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
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

module.exports = app;