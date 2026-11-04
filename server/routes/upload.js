import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve uploads dir from the *server* root (one level up from routes/).
const uploadDir = path.resolve(__dirname, '../../public/uploads');

// Ensure the upload directory exists.
fs.mkdirSync(uploadDir, { recursive: true });

const router = express.Router();

// Multer storage: keep the original extension, prefix with timestamp+random
// to avoid collisions when many users upload simultaneously.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    // Multer treats `cb(new Error(...))` as a fatal upload error.
    // We use the string-flag form so our handler can map it to 400.
    else cb(new Error('ONLY_IMAGES'), false);
  }
});

// Handle multer-specific failures (file too big, wrong type) so they map
// to clean 4xx responses instead of leaking into the generic 500 handler.
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: 0, error: 'File too large (max 5 MB)' });
    }
    return res.status(400).json({ success: 0, error: 'Upload failed' });
  }
  if (err && err.message === 'ONLY_IMAGES') {
    return res.status(400).json({ success: 0, error: 'Only image files are allowed' });
  }
  next(err);
}

// POST /api/upload - single image file upload from EditorJS ImageTool.
// Expects a multipart/form-data body with field name "file".
router.post('/', upload.single('file'), multerErrorHandler, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, error: 'No image file provided' });
  }

  const filename = req.file.filename;
  // Proxy through the API server so the dev environment doesn't need a
  // separate static mount for /uploads.
  const url = `/api/uploads/${filename}`;

  return res.status(200).json({
    success: 1,
    file: { url }
  });
});

// Serve uploaded files for preview (dev convenience).
// In production you'd serve from a CDN or object store.
// Mounted at app level so the URL is /api/uploads/:name (matches the
// URL we return from POST /api/upload) instead of the router-internal
// /api/upload/uploads/:name that this router prefix would produce.
router._serveFile = (req, res) => {
  const filePath = path.join(uploadDir, req.params.name);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Not found');
};

export default router;
