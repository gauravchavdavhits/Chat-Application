import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { MessageModel } from '../models/message.model';
import { GroupModel } from '../models/group.model';
import { uploadDir } from '../config/upload';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { deleteUploadedFile } from '../utils/file.util';

export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    const conversationIdStr = String(conversationId || '');

    // Check if conversationId refers to a group
    const cleanGroupId = conversationIdStr.startsWith('group_')
      ? conversationIdStr.replace('group_', '')
      : conversationIdStr;

    let group = null;
    if (mongoose.Types.ObjectId.isValid(cleanGroupId)) {
      group = await GroupModel.findById(cleanGroupId);
    }

    // If it is a group, verify membership
    if (group) {
      if (userId && !group.members.includes(String(userId))) {
        sendError(res, 'Access denied: You are not a member of this group', HttpStatus.FORBIDDEN, { data: [] });
        return;
      }
    }

    // Match conversationId against either cleanGroupId, group_cleanGroupId, or groupId field
    const query: any = {
      $or: [
        { conversationId },
        { conversationId: cleanGroupId },
        { conversationId: `group_${cleanGroupId}` },
        { groupId: cleanGroupId },
      ],
    };
    if (userId) {
      query.deletedFor = { $ne: String(userId) };
    }

    const messages = await MessageModel.find(query).sort({ createdAt: 1 }).lean();

    sendSuccess(res, messages, undefined, HttpStatus.OK, { count: messages.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve messages', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      sendError(res, 'No file uploaded', HttpStatus.BAD_REQUEST);
      return;
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const mimeType = req.file.mimetype.toLowerCase();

    // Check if uploaded file is a compressible raster image (JPEG, PNG, WebP, TIFF)
    // We preserve animated GIFs and SVG vectors as-is
    const isCompressibleImage =
      mimeType.startsWith('image/') &&
      mimeType !== 'image/gif' &&
      mimeType !== 'image/svg+xml';

    let finalFileName: string;
    let finalFileType: string;
    let finalBuffer: Buffer;

    if (isCompressibleImage) {
      const originalExt = path.extname(req.file.originalname);
      const baseOriginalName = path.basename(req.file.originalname, originalExt);
      finalFileName = `file-${uniqueSuffix}.webp`;
      finalFileType = 'image/webp';

      const originalSize = req.file.buffer.length;

      // Automatically convert to WebP with modern compression
      // 1. Resize if image exceeds full HD (1920px max dimension), without enlarging smaller images
      // 2. Rotate according to EXIF orientation metadata automatically
      // 3. WebP compression with quality 80 and effort 4 (~90-95% reduction from raw 10MB photo)
      finalBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      const compressedSize = finalBuffer.length;
      const reductionPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      logger.info(
        `⚡ Compressed image "${req.file.originalname}": ${(originalSize / 1024).toFixed(1)} KB ➜ ${(compressedSize / 1024).toFixed(1)} KB (${reductionPercent}% reduction) [WebP]`
      );
    } else {
      // Non-compressible files (audio, video, documents, GIFs, SVGs)
      const ext = path.extname(req.file.originalname) || '';
      finalFileName = `file-${uniqueSuffix}${ext}`;
      finalFileType = req.file.mimetype;
      finalBuffer = req.file.buffer;
    }

    // Write file to uploads directory
    const destinationPath = path.join(uploadDir, finalFileName);
    await fs.promises.writeFile(destinationPath, finalBuffer);

    // Construct the file URL as a relative path
    const fileUrl = `/uploads/${finalFileName}`;

    sendSuccess(
      res,
      {
        fileUrl,
        fileName: isCompressibleImage
          ? `${path.basename(req.file.originalname, path.extname(req.file.originalname))}.webp`
          : req.file.originalname,
        fileType: finalFileType,
        size: finalBuffer.length,
      },
      'File uploaded and processed successfully',
      HttpStatus.OK
    );
  } catch (error: any) {
    logger.error('❌ File upload/compression error:', error);
    sendError(res, error.message || 'File upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete a message and remove its file attachment from disk if present
 */
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { type = 'everyone' } = req.body;
    const currentUserId = (req as any).user?.userId;

    if (!messageId) {
      sendError(res, 'Message ID is required', HttpStatus.BAD_REQUEST);
      return;
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      sendError(res, 'Message not found', HttpStatus.NOT_FOUND);
      return;
    }

    if (type === 'me') {
      if (currentUserId) {
        await MessageModel.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: currentUserId },
        });
      }
      sendSuccess(res, { messageId, deletedForMe: true }, 'Message deleted for you', HttpStatus.OK);
      return;
    }

    // Delete for everyone
    if (message.fileUrl) {
      deleteUploadedFile(message.fileUrl);
    }

    message.isDeletedForEveryone = true;
    message.message = '';
    message.fileUrl = '';
    message.fileName = '';
    await message.save();

    sendSuccess(res, { messageId, isDeletedForEveryone: true }, 'Message deleted for everyone', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete message', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
