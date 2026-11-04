import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// GET /api/saved - Get user's saved feeds
// Query: email (required), page, limit
router.get('/', async (req, res) => {
  try {
    const email = req.query.email;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const offset = (page - 1) * limit;

    // Get saved feeds with feed details
    const savedFeeds = await db.all(`
      SELECT
        f.id, f.title, f.content, f.author_name as author, f.author_avatar, f.image_url, f.tags, f.read_time, f.created_at, f.slug,
        sf.saved_at
      FROM saved_feeds sf
      JOIN feeds f ON sf.feed_id = f.id
      WHERE sf.user_email = ?
      ORDER BY sf.saved_at DESC
      LIMIT ? OFFSET ?
    `, [email, limit, offset]);

    // Get total count
    const totalResult = await db.get(`
      SELECT COUNT(*) as count FROM saved_feeds WHERE user_email = ?
    `, [email]);

    const hasMore = offset + savedFeeds.length < totalResult.count;

    const parsed = savedFeeds.map((f) => ({
      ...f,
      tags: f.tags ? JSON.parse(f.tags) : []
    }));

    res.json({
      savedFeeds: parsed,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        hasMore
      }
    });
  } catch (err) {
    console.error('Saved feeds error:', err);
    res.status(500).json({ error: 'Failed to fetch saved feeds' });
  }
});

// POST /api/saved - Save a feed for user
// Body: email, feedId
router.post('/', async (req, res) => {
  try {
    const { email, feedId } = req.body;

    if (!email || !feedId) {
      return res.status(400).json({ error: 'Email and feedId are required' });
    }

    // Check if feed exists
    const feed = await db.get('SELECT id FROM feeds WHERE id = ?', [feedId]);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    // Ensure user exists
    await db.run('INSERT OR IGNORE INTO users (email) VALUES (?)', [email]);

    try {
      // Try to save
      const result = await db.run(`
        INSERT INTO saved_feeds (user_email, feed_id) VALUES (?, ?)
      `, [email, feedId]);

      res.json({
        saved: true,
        savedFeedId: result.lastID
      });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Feed already saved' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Save feed error:', err);
    res.status(500).json({ error: 'Failed to save feed' });
  }
});

// DELETE /api/saved/:feedId - Remove saved feed
// Query: email (required)
router.delete('/:feedId', async (req, res) => {
  try {
    const email = req.query.email;
    const feedId = req.params.feedId;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await db.run(`
      DELETE FROM saved_feeds WHERE user_email = ? AND feed_id = ?
    `, [email, feedId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved feed not found' });
    }

    res.json({ saved: false, removed: true });
  } catch (err) {
    console.error('Delete saved feed error:', err);
    res.status(500).json({ error: 'Failed to remove saved feed' });
  }
});

// GET /api/saved/check/:feedId - Check if feed is saved
// Query: email (required)
router.get('/check/:feedId', async (req, res) => {
  try {
    const email = req.query.email;
    const feedId = req.params.feedId;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const saved = await db.get(`
      SELECT 1 FROM saved_feeds WHERE user_email = ? AND feed_id = ?
    `, [email, feedId]);

    res.json({ saved: !!saved });
  } catch (err) {
    console.error('Check saved error:', err);
    res.status(500).json({ error: 'Failed to check saved status' });
  }
});

export default router;