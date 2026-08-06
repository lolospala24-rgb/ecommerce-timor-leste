import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @Roles(Role.ADMIN, Role.SELLER)
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    this.logger.log(`Received ${files?.length || 0} files for upload`);
    
    if (!files || files.length === 0) {
      this.logger.warn('No files provided');
      throw new BadRequestException('No images provided');
    }

    try {
      const urls = await this.uploadService.uploadImages(files);
      this.logger.log(`Successfully uploaded ${urls.length} images`);
      
      return {
        success: true,
        message: 'Images uploaded successfully',
        data: { urls },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.logger.error(`Upload failed: ${errorMessage}`);
      throw error;
    }
  }

  @Post('image')
  @Roles(Role.ADMIN, Role.SELLER)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image provided');
    }

    const url = await this.uploadService.uploadImage(file);
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: { url },
    };
  }
}