require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

// ==================================================
// BASIC MIDDLEWARE
// ==================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Frontend files
app.use(express.static(path.join(__dirname, "public")));

// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================================================
// DATABASE CONFIGURATION
// ==================================================

console.log("");
console.log("======================================");
console.log("       DATABASE CONFIGURATION");
console.log("======================================");

console.log(
    "DB_HOST:",
    process.env.DB_HOST ? "SET" : "MISSING"
);

console.log(
    "DB_USER:",
    process.env.DB_USER ? "SET" : "MISSING"
);

console.log(
    "DB_PASSWORD:",
    process.env.DB_PASSWORD ? "SET" : "MISSING"
);

console.log(
    "DB_NAME:",
    process.env.DB_NAME || "test"
);

console.log(
    "DB_PORT:",
    process.env.DB_PORT || "4000"
);

console.log("======================================");
console.log("");

// ==================================================
// MYSQL / TiDB CLOUD CONNECTION
// ==================================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "test",
    port: Number(process.env.DB_PORT || 4000),

    ssl: {
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==================================================
// DATABASE CONNECTION TEST
// ==================================================

db.query("SELECT 1 AS ok", (err, result) => {

    if (err) {

        console.error("");
        console.error("======================================");
        console.error("     DATABASE CONNECTION FAILED");
        console.error("======================================");
        console.error("Error Code:", err.code);
        console.error("Error Message:", err.message);
        console.error("SQL State:", err.sqlState);
        console.error("======================================");
        console.error("");

    } else {

        console.log("");
        console.log("======================================");
        console.log("     DATABASE CONNECTED SUCCESSFULLY");
        console.log("======================================");
        console.log("TiDB Cloud connection is working.");
        console.log("======================================");
        console.log("");
    }
});

// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/api/health", (req, res) => {

    db.query("SELECT 1 AS ok", (err, result) => {

        if (err) {

            console.error("Health Check DB Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database connection failed",
                error: err.message,
                code: err.code
            });
        }

        return res.json({
            success: true,
            message: "Server and TiDB are working",
            database: result
        });
    });
});

// ==================================================
// ADMIN LOGIN
// ==================================================

app.post("/api/admin-login", (req, res) => {

    const password = String(req.body.password || "");

    if (!password) {

        return res.json({
            success: false,
            message: "Password is required"
        });
    }

    const sql = `
        SELECT id, password
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error("");
            console.error("======================================");
            console.error("     ADMIN LOGIN DATABASE ERROR");
            console.error("======================================");
            console.error("Error Code:", err.code);
            console.error("Error Message:", err.message);
            console.error("SQL State:", err.sqlState);
            console.error("======================================");

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        if (!results || results.length === 0) {

            return res.json({
                success: false,
                message: "Admin settings not found"
            });
        }

        const admin = results[0];

        if (String(admin.password) === password) {

            return res.json({
                success: true,
                message: "Login successful"
            });
        }

        return res.json({
            success: false,
            message: "Incorrect password!"
        });
    });
});

// ==================================================
// CHANGE ADMIN PASSWORD
// ==================================================

app.post("/api/change-password", (req, res) => {

    const oldPassword = String(req.body.oldPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!oldPassword || !newPassword) {

        return res.json({
            success: false,
            message: "Both passwords are required"
        });
    }

    if (newPassword.length < 4) {

        return res.json({
            success: false,
            message: "New password must be at least 4 characters"
        });
    }

    const selectSql = `
        SELECT password
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
    `;

    db.query(selectSql, (err, results) => {

        if (err) {

            console.error("Password Check Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        if (!results || results.length === 0) {

            return res.json({
                success: false,
                message: "Admin settings not found"
            });
        }

        if (String(results[0].password) !== oldPassword) {

            return res.json({
                success: false,
                message: "Old password is incorrect!"
            });
        }

        const updateSql = `
            UPDATE admin_settings
            SET password = ?
            WHERE id = 1
        `;

        db.query(updateSql, [newPassword], (updateErr) => {

            if (updateErr) {

                console.error("Password Update Error:", updateErr);

                return res.status(500).json({
                    success: false,
                    message: "Failed to update password: " + updateErr.message,
                    code: updateErr.code
                });
            }

            return res.json({
                success: true,
                message: "Password changed successfully!"
            });
        });
    });
});

// ==================================================
// ADD / UPLOAD MOVIE
// ==================================================

app.post("/api/upload-content", (req, res) => {

    const {
        title,
        category,
        poster_url,
        banner_url,
        uploadType,
        drive_link,
        embed_link
    } = req.body;

    if (!title || !category || !poster_url) {

        return res.status(400).json({
            success: false,
            message: "Title, category and poster URL are required"
        });
    }

    let finalDriveLink = "";
    let finalEmbedLink = "";
    let sourceType = uploadType || "link";

    if (uploadType === "link") {

        finalDriveLink = String(drive_link || "").trim();

    } else if (uploadType === "embed") {

        finalEmbedLink = String(embed_link || "").trim();

    } else if (uploadType === "gdrive") {

        finalDriveLink = String(drive_link || "").trim();
        sourceType = "gdrive";

    } else {

        finalDriveLink = String(drive_link || "").trim();
        finalEmbedLink = String(embed_link || "").trim();
    }

    const sql = `
        INSERT INTO movies
        (
            title,
            category,
            poster_url,
            banner_url,
            drive_link,
            embed_link,
            source_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        String(title).trim(),
        String(category).trim(),
        String(poster_url).trim(),
        String(banner_url || "").trim(),
        finalDriveLink,
        finalEmbedLink,
        sourceType
    ];

    db.query(sql, values, (err, result) => {

        if (err) {

            console.error("Upload Movie Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        return res.json({
            success: true,
            message: "Content uploaded successfully!",
            id: result.insertId
        });
    });
});

// ==================================================
// GET ALL MOVIES
// ==================================================

app.get("/api/movies", (req, res) => {

    const sql = `
        SELECT
            id,
            title,
            category,
            poster_url,
            banner_url,
            drive_link,
            embed_link,
            source_type,
            created_at
        FROM movies
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error("Fetch Movies Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        return res.json(results);
    });
});

// ==================================================
// GET SINGLE MOVIE
// ==================================================

app.get("/api/movies/:id", (req, res) => {

    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId)) {

        return res.status(400).json({
            success: false,
            message: "Invalid movie ID"
        });
    }

    const sql = `
        SELECT
            id,
            title,
            category,
            poster_url,
            banner_url,
            drive_link,
            embed_link,
            source_type,
            created_at
        FROM movies
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [movieId], (err, results) => {

        if (err) {

            console.error("Get Movie Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        if (!results || results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        return res.json(results[0]);
    });
});

// ==================================================
// UPDATE MOVIE
// ==================================================

app.put("/api/update-movie/:id", (req, res) => {

    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId)) {

        return res.status(400).json({
            success: false,
            message: "Invalid movie ID"
        });
    }

    const {
        title,
        category,
        poster_url,
        banner_url,
        drive_link,
        embed_link,
        source_type
    } = req.body;

    if (!title || !category || !poster_url) {

        return res.status(400).json({
            success: false,
            message: "Title, category and poster URL are required"
        });
    }

    const sql = `
        UPDATE movies
        SET
            title = ?,
            category = ?,
            poster_url = ?,
            banner_url = ?,
            drive_link = ?,
            embed_link = ?,
            source_type = ?
        WHERE id = ?
    `;

    const values = [
        String(title).trim(),
        String(category).trim(),
        String(poster_url).trim(),
        String(banner_url || "").trim(),
        String(drive_link || "").trim(),
        String(embed_link || "").trim(),
        String(source_type || "link").trim(),
        movieId
    ];

    db.query(sql, values, (err, result) => {

        if (err) {

            console.error("Update Movie Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        return res.json({
            success: true,
            message: "Movie updated successfully!"
        });
    });
});

// ==================================================
// DELETE MOVIE
// ==================================================

app.delete("/api/delete-movie/:id", (req, res) => {

    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId)) {

        return res.status(400).json({
            success: false,
            message: "Invalid movie ID"
        });
    }

    const sql = `
        DELETE FROM movies
        WHERE id = ?
    `;

    db.query(sql, [movieId], (err, result) => {

        if (err) {

            console.error("Delete Movie Error:", err);

            return res.status(500).json({
                success: false,
                message: "Database error: " + err.message,
                code: err.code
            });
        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        return res.json({
            success: true,
            message: "Movie deleted successfully!"
        });
    });
});

// ==================================================
// API 404
// ==================================================

app.use("/api", (req, res) => {

    return res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

// ==================================================
// LOCAL SERVER
// ==================================================

if (process.env.NODE_ENV !== "production") {

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {

        console.log("");
        console.log("======================================");
        console.log(`StreamVibe server running on port ${PORT}`);
        console.log("======================================");
        console.log("");
    });
}

// ==================================================
// VERCEL
// ==================================================

module.exports = app;