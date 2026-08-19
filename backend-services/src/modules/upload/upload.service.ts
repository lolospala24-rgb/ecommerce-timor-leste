import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private cloudinaryService: CloudinaryService) {}

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      try {
        this.logger.log(`Uploading file: ${file.originalname}, size: ${file.size}`);
        
        const result = await this.cloudinaryService.uploadFile(file, {
          folder: 'ecommerce-timor/products',
          transformation: {
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 85,
          },
        });
        
        this.logger.log(`Uploaded: ${result.secure_url}`);
        urls.push(result.secure_url);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to upload image: ${errorMessage}`);
        throw new BadRequestException(`Failed to upload image: ${errorMessage}`);
      }
    }

    return urls;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'ecommerce-timor/products',
        transformation: {
          width: 1200,
          height: 1200,
          crop: 'limit',
          quality: 85,
        },
      });
      return result.secure_url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload image: ${errorMessage}`);
      throw new BadRequestException(`Failed to upload image: ${errorMessage}`);
    }
  }

  async uploadVideo(file: Express.Multer.File): Promise<string> {
    try {
      this.logger.log(`Uploading video: ${file.originalname}, size: ${file.size}`);

      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'ecommerce-timor/products/videos',
        resource_type: 'video',
        chunk_size: 6000000,
        quality: 'auto:good',
      });

      this.logger.log(`Uploaded video: ${result.secure_url}`);
      return result.secure_url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload video: ${errorMessage}`);
      throw new BadRequestException(`Failed to upload video: ${errorMessage}`);
    }
  }
}