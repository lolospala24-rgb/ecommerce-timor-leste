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

const ALLOWED_SPREADSHEET_EXTENSIONS = /\.(csv|xlsx)$/i;
const ALLOWED_SPREADSHEET_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel', // some browsers send this for .csv
  'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]);

// Bulk product import (CSV/Excel) — same memory-storage rationale as
// multerConfig above, since import.util.ts's exceljs parser reads directly
// from file.buffer.
export const spreadsheetMulterConfig: MulterOptions = {
  fileFilter: (_req, file, callback) => {
    if (
      !ALLOWED_SPREADSHEET_EXTENSIONS.test(file.originalname) ||
      !ALLOWED_SPREADSHEET_MIME_TYPES.has(file.mimetype)
    ) {
      callback(new BadRequestException('Only CSV and XLSX files are allowed'), false);
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB — plenty for thousands of product rows
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

// FileFieldsInterceptor (video-shop's POST/PATCH /videos — one request
// carrying both a 'video' field and a 'thumbnail' field) applies a single
// MulterOptions to every field in the call, so it can't just reuse
// multerConfig or videoMulterConfig alone — the fileFilter below branches
// on fieldname to apply the right extension/mimetype check to each, and
// the shared 100MB ceiling is sized for the video field (the thumbnail is
// a small image in practice; the video is what actually needs the limit).
export const videoWithThumbnailMulterConfig: MulterOptions = {
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === 'thumbnail') {
      if (
        !ALLOWED_IMAGE_EXTENSIONS.test(file.originalname) ||
        !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)
      ) {
        callback(
          new BadRequestException('Thumbnail must be a JPG, PNG, GIF, or WEBP image file'),
          false,
        );
        return;
      }
      callback(null, true);
      return;
    }

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