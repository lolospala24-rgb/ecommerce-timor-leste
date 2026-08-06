import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VideosRepository } from './videos.repository';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class VideosService {
  constructor(
    private repo: VideosRepository,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateVideoDto) {
    const data: any = {
      title: dto.title,
      description: dto.description,
      videoUrl: dto.videoUrl,
      thumbnailUrl: dto.thumbnailUrl,
      productId: dto.productId ?? null,
      isActive: dto.isActive ?? true,
    };

    const video = await this.repo.create(data);
    return video;
  }

  async createWithUpload(
    dto: CreateVideoDto,
    videoFile?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File,
  ) {
    let videoUrl = dto.videoUrl;
    let thumbnailUrl = dto.thumbnailUrl;

    if (videoFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(videoFile, {
        folder: 'ecommerce-timor/videos',
        resource_type: 'video',
        chunk_size: 6000000,
        quality: 'auto:best',
      });
      videoUrl = uploadResult.secure_url;
    }

    if (thumbnailFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(thumbnailFile, {
        folder: 'ecommerce-timor/videos/thumbnails',
        resource_type: 'image',
        quality: 'auto:good',
      });
      thumbnailUrl = uploadResult.secure_url;
    }

    if (!videoUrl) {
      throw new BadRequestException('Video URL or uploaded video file is required');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      videoUrl,
      thumbnailUrl,
      productId: dto.productId ?? null,
      isActive: dto.isActive ?? true,
    };

    const video = await this.repo.create(data);
    return video;
  }

  async updateWithUpload(
    id: number,
    dto: UpdateVideoDto,
    videoFile?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File,
  ) {
    await this.findById(id);

    const data: any = { ...dto };

    if (videoFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(videoFile, {
        folder: 'ecommerce-timor/videos',
        resource_type: 'video',
        chunk_size: 6000000,
        quality: 'auto:best',
      });
      data.videoUrl = uploadResult.secure_url;
    }

    if (thumbnailFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(thumbnailFile, {
        folder: 'ecommerce-timor/videos/thumbnails',
        resource_type: 'image',
        quality: 'auto:good',
      });
      data.thumbnailUrl = uploadResult.secure_url;
    }

    const updated = await this.repo.update(id, data);
    return updated;
  }

  async findById(id: number) {
    const video = await this.repo.findById(id);
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async update(id: number, dto: UpdateVideoDto) {
    await this.findById(id);
    const data: any = { ...dto };
    const updated = await this.repo.update(id, data);
    return updated;
  }

  async remove(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  async feed(query: any) {
    return this.repo.findFeed(query);
  }

  async incrementAnalytics(id: number, action: 'views' | 'likes' | 'shares') {
    await this.findById(id);
    return this.repo.incrementField(id, action);
  }

  async decrementLikes(id: number) {
    await this.findById(id);
    return this.repo.decrementField(id, 'likes');
  }

  async getVideoProducts(id: number) {
    await this.findById(id);
    return this.repo.findProductsByVideoId(id);
  }

  async getRecommendations(id: number) {
    await this.findById(id);
    return this.repo.findRecommendations(id);
  }
}
