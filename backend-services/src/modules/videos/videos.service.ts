import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VideosRepository } from './videos.repository';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { Role } from '@prisma/client';

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

  async findById(id: number, viewerId?: number | null) {
    const video = await this.repo.findById(id, viewerId);
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

  async feed(query: any, viewerId?: number | null) {
    return this.repo.findFeed(query, viewerId);
  }

  async adminList(query: any) {
    return this.repo.findAllAdmin(query);
  }

  async adminListComments(query: any) {
    return this.repo.findAllComments(query);
  }

  async incrementAnalytics(id: number, action: 'views' | 'shares') {
    await this.findById(id);
    return this.repo.incrementField(id, action);
  }

  async getVideoProducts(id: number) {
    await this.findById(id);
    return this.repo.findProductsByVideoId(id);
  }

  async getRecommendations(id: number, viewerId?: number | null) {
    await this.findById(id);
    return this.repo.findRecommendations(id, viewerId);
  }

  // ==================== Likes ====================

  async likeVideo(id: number, userId: number) {
    await this.findById(id);
    const result = await this.repo.likeVideo(id, userId);
    return { liked: true, likes: result?.likes ?? 0 };
  }

  async unlikeVideo(id: number, userId: number) {
    await this.findById(id);
    const result = await this.repo.unlikeVideo(id, userId);
    return { liked: false, likes: result?.likes ?? 0 };
  }

  // ==================== Saves / Bookmarks ====================

  async saveVideo(id: number, userId: number) {
    await this.findById(id);
    const saves = await this.repo.saveVideo(id, userId);
    return { saved: true, saves };
  }

  async unsaveVideo(id: number, userId: number) {
    await this.findById(id);
    const saves = await this.repo.unsaveVideo(id, userId);
    return { saved: false, saves };
  }

  async getSavedVideos(userId: number, pagination: { page?: number; limit?: number }) {
    return this.repo.findSavedByUser(userId, pagination);
  }

  // ==================== Comments ====================

  async getComments(videoId: number, pagination: { page?: number; limit?: number }) {
    await this.findById(videoId);
    return this.repo.findComments(videoId, pagination);
  }

  async addComment(videoId: number, userId: number, dto: CreateCommentDto) {
    await this.findById(videoId);

    if (dto.parentId) {
      const parent = await this.repo.findCommentById(dto.parentId);
      if (!parent || parent.videoId !== videoId) {
        throw new BadRequestException('Parent comment not found on this video');
      }
    }

    return this.repo.createComment(videoId, userId, dto.content, dto.parentId);
  }

  async deleteComment(commentId: number, userId: number, userRole: string) {
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.repo.deleteComment(commentId);
  }

  async likeComment(commentId: number) {
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    return this.repo.likeComment(commentId);
  }
}
