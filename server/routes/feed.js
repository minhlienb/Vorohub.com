import express from 'express';
import db from '../db/index.js';
import { makeSlug } from '../db/slug.js';

const router = express.Router();

// POST /api/feed - Create a new article from the writer screen.
// Body: { title, content (HTML), image_url?, tags (array|csv), author?,
//         author_avatar?, read_time? }. Server generates the URL slug.
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      image_url,
      tags,
      author,
      author_email,
      author_avatar,
      read_time
    } = req.body || {};

    if (!title || !String(title).toString().trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const cleanTitle = String(title).toString().trim();

    // Normalize tags into a JSON array (accept array or comma-separated CSV).
    let tagArr = [];
    if (Array.isArray(tags)) {
      tagArr = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      tagArr = tags.split(',').map((t) => String(t).trim()).filter(Boolean);
    }
    const tagsJson = JSON.stringify(tagArr);

    // Estimate read time in minutes from plain-text length (~200 wpm).
    const textLen = String(content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim().length;
    const words = Math.max(0, Math.round(textLen / 6));
    const estMinutes = read_time
      ? Math.max(1, Number(read_time) || 1)
      : Math.max(1, Math.round(words / 200));

    const result = await db.run(
      `INSERT INTO feeds (title, content, author_name, author_email, author_avatar, image_url, tags, read_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanTitle,
        String(content || ''),
        author || 'Anonymous',
        author_email || null,
        author_avatar || null,
        image_url || null,
        tagsJson,
        estMinutes
      ]
    );

    const id = result.lastID;
    const row = await db.get('SELECT created_at FROM feeds WHERE id = ?', [id]);
    const slug = makeSlug(cleanTitle, row.created_at);
    await db.run('UPDATE feeds SET slug = ? WHERE id = ?', [slug, id]);

    res.status(201).json({ feed: { id, slug, title: cleanTitle } });
  } catch (err) {
    console.error('Feed create error:', err);
    res.status(500).json({ error: 'Failed to create feed' });
  }
});

// GET /api/feed - Get paginated feed
// Query: page (default 1), limit (default 10), cursor (for cursor-based pagination)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const email = req.query.email; // Optional - for checking saved status
    const search = req.query.search ? String(req.query.search).trim() : '';

    let feeds;

    if (search) {
      // Search across title, content and tags.
      const like = `%${search}%`;
      feeds = await db.all(`
        SELECT
          id, title, content, author_name as author, author_avatar,
          image_url, tags, read_time, claps, created_at, slug
        FROM feeds
        WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
        ORDER BY id DESC
        LIMIT ?
      `, [like, like, like, limit]);
    } else if (cursor) {
      // Cursor-based pagination (more efficient for infinite scroll)
      feeds = await db.all(`
        SELECT
          id, title, content, author_name as author, author_avatar,
          image_url, tags, read_time, claps, created_at, slug
        FROM feeds
        WHERE id < ?
        ORDER BY id DESC
        LIMIT ?
      `, [cursor, limit]);
    } else {
      // Offset-based pagination
      const offset = (page - 1) * limit;
      feeds = await db.all(`
        SELECT
          id, title, content, author_name as author, author_avatar,
          image_url, tags, read_time, claps, created_at, slug
        FROM feeds
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
    }

    // Get total count
    const totalResult = await db.get('SELECT COUNT(*) as count FROM feeds');
    const total = totalResult.count;

    // If email provided, check saved status for each feed
    let savedStatus = {};
    if (email) {
      const savedFeeds = await db.all(`
        SELECT feed_id FROM saved_feeds WHERE user_email = ?
      `, [email]);
      savedStatus = Object.fromEntries(savedFeeds.map(sf => [sf.feed_id, true]));
    }

    // Parse tags JSON for each feed
    const processedFeeds = feeds.map(feed => ({
      ...feed,
      tags: feed.tags ? JSON.parse(feed.tags) : [],
      saved: !!savedStatus[feed.id]
    }));

    // Get next cursor (last item's id)
    const nextCursor = feeds.length > 0 ? feeds[feeds.length - 1].id : null;
    const hasMore = feeds.length === limit;

    res.json({
      feeds: processedFeeds,
      pagination: {
        page,
        limit,
        nextCursor,
        hasMore,
        total
      }
    });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /api/feed/mine - List all articles authored by the given email.
// Used by the profile page "My articles" tab. Registered BEFORE the
// catch-all `/:id` route so the literal path "mine" doesn't get matched
// as id="mine".
router.get('/mine', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    const feeds = await db.all(
      `SELECT
         id, title, content, author_name as author, author_email,
         author_avatar, image_url, tags, read_time, claps,
         created_at, slug
       FROM feeds
       WHERE author_email = ?
       ORDER BY id DESC`,
      [String(email).trim()]
    );
    const processed = feeds.map((feed) => ({
      ...feed,
      tags: feed.tags ? JSON.parse(feed.tags) : []
    }));
    res.json({ feeds: processed, total: processed.length });
  } catch (err) {
    console.error('Feed mine error:', err);
    res.status(500).json({ error: 'Failed to fetch my feeds' });
  }
});

// GET /api/feed/:id - Get single feed item by numeric id or URL slug
router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const byColumn = /^\d+$/.test(param) ? 'id' : 'slug';
    const feed = await db.get(`
      SELECT
        id, title, content, author_name as author, author_avatar,
        image_url, tags, read_time, claps, created_at, slug
      FROM feeds
      WHERE ${byColumn} = ?
    `, [param]);

    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    feed.tags = feed.tags ? JSON.parse(feed.tags) : [];
    res.json({ feed });
  } catch (err) {
    console.error('Feed detail error:', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// PUT /api/feed/:id - Update an article. Only the author (matched by
// author_email) is allowed to edit. Returns the updated feed row.
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title,
      content,
      image_url,
      tags,
      author_email,
      author,
      author_avatar,
      read_time
    } = req.body || {};

    if (!author_email || !String(author_email).trim()) {
      return res.status(401).json({ error: 'author_email is required' });
    }

    const existing = await db.get('SELECT * FROM feeds WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    if (existing.author_email !== String(author_email).trim()) {
      return res.status(403).json({ error: 'Not allowed to edit this article' });
    }

    const cleanTitle = title ? String(title).trim() : existing.title;
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    let tagArr = existing.tags ? JSON.parse(existing.tags) : [];
    if (Array.isArray(tags)) {
      tagArr = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      tagArr = tags.split(',').map((t) => String(t).trim()).filter(Boolean);
    }

    // Recompute read_time when content changes; otherwise keep the stored one.
    let nextReadTime = existing.read_time;
    if (content !== undefined && content !== null) {
      const textLen = String(content)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim().length;
      const words = Math.max(0, Math.round(textLen / 6));
      nextReadTime = read_time
        ? Math.max(1, Number(read_time) || 1)
        : Math.max(1, Math.round(words / 200));
    } else if (read_time) {
      nextReadTime = Math.max(1, Number(read_time) || 1);
    }

    await db.run(
      `UPDATE feeds
       SET title = ?, content = ?, author_name = ?, author_avatar = ?,
           image_url = ?, tags = ?, read_time = ?
       WHERE id = ?`,
      [
        cleanTitle,
        content !== undefined ? String(content) : existing.content,
        author || existing.author_name,
        author_avatar !== undefined ? author_avatar : existing.author_avatar,
        image_url !== undefined ? (image_url || null) : existing.image_url,
        JSON.stringify(tagArr),
        nextReadTime,
        id
      ]
    );

    const updated = await db.get(
      `SELECT id, title, content, author_name as author, author_email,
              author_avatar, image_url, tags, read_time, claps,
              created_at, slug
       FROM feeds WHERE id = ?`,
      [id]
    );
    updated.tags = updated.tags ? JSON.parse(updated.tags) : [];
    res.json({ feed: updated });
  } catch (err) {
    console.error('Feed update error:', err);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

export default router;