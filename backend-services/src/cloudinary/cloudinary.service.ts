import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import * as streamifier from 'streamifier';

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

  async deleteFile(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
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