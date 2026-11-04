import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../database/feed.db');

const raw = new DatabaseSync(dbPath);
raw.exec('PRAGMA foreign_keys = ON;');

// Adapter: giữ API kiểu wrapper `sqlite` (async, db.all/get/run/exec)
export const db = {
  exec: async (sql) => raw.exec(sql),
  all: async (sql, ...params) => raw.prepare(sql).all(...flat(params)),
  get: async (sql, ...params) => raw.prepare(sql).get(...flat(params)),
  run: async (sql, ...params) => {
    const r = raw.prepare(sql).run(...flat(params));
    return { changes: r.changes, lastID: Number(r.lastInsertRowid) };
  },
  prepare: async (sql) => {
    const stmt = raw.prepare(sql);
    return {
      run: async (...params) => stmt.run(...flat(params)),
      get: async (...params) => stmt.get(...flat(params)),
      all: async (...params) => stmt.all(...flat(params)),
      finalize: async () => {},
    };
  },
};

// Cho phép truyền mảng params như sqlite3: db.all(sql, [a, b])
function flat(params) {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
}

// Migration giữ nguyên như cũ
await db.exec('ALTER TABLE feeds ADD COLUMN slug TEXT').catch(() => {});
await db.exec('ALTER TABLE feeds ADD COLUMN author_email TEXT').catch(() => {});

const toBackfill = await db.all(
  "SELECT id, title, created_at FROM feeds WHERE slug IS NULL OR slug = ''"
);
if (toBackfill.length) {
  const { makeSlug } = await import('./slug.js');
  const update = await db.prepare('UPDATE feeds SET slug = ? WHERE id = ?');
  for (const row of toBackfill) {
    await update.run(makeSlug(row.title, row.created_at), row.id);
  }
  await update.finalize();
}

export default db;