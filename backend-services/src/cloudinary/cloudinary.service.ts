import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import * as streamifier from 'streamifier';

// Every upload path (product images, store logos, payment proofs, reviews,
// videos) funnels through uploadFile() below, so this is the one place that
// needs to check what a file actually IS rather than what its filename/
// Content-Type claims — multer's fileFilter only sees those client-supplied
// labels, never the bytes (file.buffer isn't populated until after multer
// finishes reading the upload, by which point fileFilter has already run).
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
]);

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    this.logger.log(`Cloudinary Config - Cloud Name: ${cloudName ? '✓' : '✗'}`);
    this.logger.log(`Cloudinary Config - API Key: ${apiKey ? '✓' : '✗'}`);
    this.logger.log(`Cloudinary Config - API Secret: ${apiSecret ? '✓' : '✗'}`);

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Cloudinary credentials missing!');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    // Inspect the actual file bytes rather than trusting the client-supplied
    // extension/Content-Type — a renamed non-image file would otherwise
    // sail through multer's filename/mimetype check untouched.
    // file-type v22 ships ESM-only with an export map our CommonJS project's
    // moduleResolution can't type-check against — the dynamic import itself
    // works fine at runtime regardless, so it's cast loosely here rather
    // than widening moduleResolution project-wide for one dependency.
    const { fileTypeFromBuffer } = (await import('file-type')) as {
      fileTypeFromBuffer: (buffer: Buffer) => Promise<{ mime: string } | undefined>;
    };
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !ALLOWED_UPLOAD_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException(
        'This file does not look like a valid image or video. Please upload a real JPG, PNG, GIF, WEBP, MP4, WebM, or MOV file.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: UploadApiOptions = {
        folder: options?.folder || 'ecommerce-timor',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options,
      };

      this.logger.log(`Uploading to Cloudinary: ${file.originalname}`);

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`);
            reject(new BadRequestException(`Failed to upload image: ${error.message}`));
          } else {
            this.logger.log(`Cloudinary upload success: ${result.secure_url}`);
            resolve(result);
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // resourceType defaults to 'image' (Cloudinary's own default when
  // unspecified) — every pre-existing caller deletes an image and stays
  // unaffected; video deletion (videos.service.ts) passes 'video'
  // explicitly, since Cloudinary looks in the wrong resource namespace
  // otherwise and silently fails to find/delete the asset.
  async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
        if (error) {
          this.logger.error(`Cloudinary delete error: ${error.message}`);
          reject(new BadRequestException(`Failed to delete image: ${error.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }
}