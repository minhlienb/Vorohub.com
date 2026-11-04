import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import feedRoutes from './routes/feed.js';
import savedRoutes from './routes/saved.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || console.log('BACKEND_PORT not set');

const distPath = path.resolve(__dirname, '../ui/dist');

// Middleware
app.use(cors({
  origin: [`http://localhost:${process.env.FRONTEND_PORT || console.log('FRONTEND_PORT not set')}`],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/feed', feedRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files at /api/uploads/:name so the URL returned from
// POST /api/upload resolves directly.
app.get('/api/uploads/:name', uploadRoutes._serveFile);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built SPA and add a history-API fallback so client-side routes
// (e.g. /read/<slug>, /short/<slug>) survive a full page reload instead of
// falling through to a JSON 404 that the browser would download. In dev the
// Vite server (:5173) serves the app; this lets the API server (:3001) host
// it too. Guarded so the API still works if the SPA hasn't been built.
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});