import path from 'path';
import fs from 'fs';
import { logger } from './logger';

/**
 * Safely delete a local file given its URL path (e.g., "/uploads/file-123.webp")
 * Prevents directory traversal and only deletes files inside the project's 'uploads' directory.
 */
export const deleteUploadedFile = (fileUrl?: string | null): boolean => {
  if (!fileUrl || typeof fileUrl !== 'string') return false;

  try {
    // Only handle local uploads
    const cleanUrl = fileUrl.trim().split('?')[0];
    if (!cleanUrl.startsWith('/uploads/')) {
      return false;
    }

    // Extract relative path within uploads folder
    const relativeSubPath = cleanUrl.replace(/^\/uploads\//, '');
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const absoluteTarget = path.resolve(uploadsRoot, relativeSubPath);

    // Security check: ensure target is strictly inside uploads directory (prevent path traversal)
    if (!absoluteTarget.startsWith(uploadsRoot)) {
      logger.warn(`⚠️ Path traversal attempt blocked: ${fileUrl}`);
      return false;
    }

    if (fs.existsSync(absoluteTarget)) {
      const stats = fs.statSync(absoluteTarget);
      if (stats.isFile()) {
        fs.unlinkSync(absoluteTarget);
        logger.info(`🗑️ Uploaded file deleted: ${absoluteTarget}`);
        return true;
      }
    }
  } catch (err: any) {
    logger.error(`❌ Failed to delete uploaded file (${fileUrl}):`, err.message);
  }

  return false;
};
