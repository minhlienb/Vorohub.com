import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// POST /api/auth/login - Simple email-based login (stores in localStorage on client)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Create or get user
    await db.run('INSERT OR IGNORE INTO users (email) VALUES (?)', [email]);
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    res.json({
      user: {
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/user - Get user info by email
router.get('/user', async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;