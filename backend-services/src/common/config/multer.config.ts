import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp)$/i;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Shared Multer options for every endpoint that accepts image uploads
// (product images, seller store logos, payment proof screenshots).
// Deliberately no `storage` override: Multer's default memory storage keeps
// `file.buffer` populated, which CloudinaryService.uploadFile() streams
// directly via streamifier — disk storage would leave `buffer` undefined
// and silently break every upload path.
export const multerConfig: MulterOptions = {
  fileFilter: (_req, file, callback) => {
    if (
      !ALLOWED_IMAGE_EXTENSIONS.test(file.originalname) ||
      !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)
    ) {
      callback(
        new BadRequestException('Only JPG, PNG, GIF, and WEBP image files are allowed'),
        false,
      );
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

const ALLOWED_VIDEO_EXTENSIONS = /\.(mp4|webm|mov)$/i;
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
]);

// Same memory-storage rationale as multerConfig above — CloudinaryService
// streams file.buffer, so no `storage` override here either.
export const videoMulterConfig: MulterOptions = {
  fileFilter: (_req, file, callback) => {
    if (
      !ALLOWED_VIDEO_EXTENSIONS.test(file.originalname) ||
      !ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype)
    ) {
      callback(
        new BadRequestException('Only MP4, WebM, and MOV video files are allowed'),
        false,
      );
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
};