const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt'); // You'll need to install this: npm install bcrypt

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Test endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Register Endpoint
app.post('/api/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [name, email, hashedPassword, phone, role || 'user']);

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        console.error('Registration Error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // In a real app, generate a JWT token here
        // For simplicity, we'll return user info (excluding password)
        const { password: _, ...userWithoutPassword } = user;

        res.json({ message: 'Login successful', user: userWithoutPassword });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
