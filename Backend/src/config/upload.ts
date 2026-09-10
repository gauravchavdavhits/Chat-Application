import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
export const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage allows us to inspect and compress images with Sharp before saving to disk
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  // Documents
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit to allow raw high-res camera photos
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format (${file.mimetype}). Upload allowed only for safe media & docs.`));
    }
  },
});
