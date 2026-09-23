import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VideosRepository } from './videos.repository';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { RedisService } from '../../redis/redis.service';
import { Role } from '@prisma/client';

// Same viewer counted repeatedly within this window doesn't inflate the
// view counter again — long enough that a genuine rewatch a few scrolls
// later still counts as one view of interest, short enough that a real
// return visit tomorrow counts fresh.
const VIEW_DEDUP_WINDOW_SECONDS = 30 * 60;

@Injectable()
export class VideosService {
  constructor(
    private repo: VideosRepository,
    private cloudinaryService: CloudinaryService,
    private redisService: RedisService,
  ) {}

  // CreateVideoDto/UpdateVideoDto type these as strings, not booleans — see
  // the DTO's own doc-comment for why. undefined stays undefined (an
  // update that doesn't mention a toggle must leave it alone).
  private parseBooleanString(value?: string): boolean | undefined {
    return value === undefined ? undefined : value === 'true';
  }

  // publishedAt is derived from status, not trusted verbatim from the DTO:
  // PUBLISHED always means "now" (an admin can't backdate/postdate a live
  // video by hand-editing this), SCHEDULED must carry the admin's chosen
  // future time, and PENDING/REJECTED have none.
  private resolvePublishedAt(status: string | undefined, requested?: string) {
    if (status === 'PUBLISHED') return new Date();
    if (status === 'SCHEDULED') {
      if (!requested) {
        throw new BadRequestException('publishedAt is required when scheduling a video');
      }
      const when = new Date(requested);
      if (when.getTime() <= Date.now()) {
        throw new BadRequestException('Scheduled publish time must be in the future');
      }
      return when;
    }
    return null;
  }

  async create(dto: CreateVideoDto) {
    const status = dto.status ?? 'PENDING';
    const data: any = {
      title: dto.title,
      description: dto.description,
      videoUrl: dto.videoUrl,
      thumbnailUrl: dto.thumbnailUrl,
      productId: dto.productId ?? null,
      status,
      visibility: dto.visibility,
      allowComments: this.parseBooleanString(dto.allowComments),
      allowLikes: this.parseBooleanString(dto.allowLikes),
      allowSharing: this.parseBooleanString(dto.allowSharing),
      allowSave: this.parseBooleanString(dto.allowSave),
      enableShopping: this.parseBooleanString(dto.enableShopping),
      publishedAt: this.resolvePublishedAt(status, dto.publishedAt),
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
    let videoPublicId: string | undefined;
    let thumbnailPublicId: string | undefined;
    let duration: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let format: string | undefined;

    if (videoFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(videoFile, {
        folder: 'ecommerce-timor/videos',
        resource_type: 'video',
        chunk_size: 6000000,
        quality: 'auto:best',
      });
      videoUrl = uploadResult.secure_url;
      videoPublicId = uploadResult.public_id;
      duration = uploadResult.duration;
      width = uploadResult.width;
      height = uploadResult.height;
      format = uploadResult.format;
    }

    if (thumbnailFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(thumbnailFile, {
        folder: 'ecommerce-timor/videos/thumbnails',
        resource_type: 'image',
        quality: 'auto:good',
      });
      thumbnailUrl = uploadResult.secure_url;
      thumbnailPublicId = uploadResult.public_id;
    }

    if (!videoUrl) {
      throw new BadRequestException('Video URL or uploaded video file is required');
    }

    const status = dto.status ?? 'PENDING';
    const data: any = {
      title: dto.title,
      description: dto.description,
      videoUrl,
      thumbnailUrl,
      videoPublicId,
      thumbnailPublicId,
      duration,
      width,
      height,
      format,
      productId: dto.productId ?? null,
      status,
      visibility: dto.visibility,
      allowComments: this.parseBooleanString(dto.allowComments),
      allowLikes: this.parseBooleanString(dto.allowLikes),
      allowSharing: this.parseBooleanString(dto.allowSharing),
      allowSave: this.parseBooleanString(dto.allowSave),
      enableShopping: this.parseBooleanString(dto.enableShopping),
      publishedAt: this.resolvePublishedAt(status, dto.publishedAt),
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
    const existing = await this.findById(id);

    const data: any = { ...dto };
    // DTO carries these as strings (see CreateVideoDto's doc-comment) — the
    // spread above copies the raw strings verbatim, so each one that was
    // actually provided needs converting before this reaches Prisma.
    // undefined (not provided) is left alone rather than overwritten with
    // `undefined` again — harmless either way, but explicit about intent.
    if (dto.allowComments !== undefined) data.allowComments = this.parseBooleanString(dto.allowComments);
    if (dto.allowLikes !== undefined) data.allowLikes = this.parseBooleanString(dto.allowLikes);
    if (dto.allowSharing !== undefined) data.allowSharing = this.parseBooleanString(dto.allowSharing);
    if (dto.allowSave !== undefined) data.allowSave = this.parseBooleanString(dto.allowSave);
    if (dto.enableShopping !== undefined) data.enableShopping = this.parseBooleanString(dto.enableShopping);
    // Only recompute publishedAt when this update actually changes status —
    // an edit that doesn't touch status (e.g. just the title) must leave
    // the existing publish/schedule time alone.
    if (dto.status) {
      data.publishedAt = this.resolvePublishedAt(dto.status, dto.publishedAt);
    }

    if (videoFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(videoFile, {
        folder: 'ecommerce-timor/videos',
        resource_type: 'video',
        chunk_size: 6000000,
        quality: 'auto:best',
      });
      data.videoUrl = uploadResult.secure_url;
      data.videoPublicId = uploadResult.public_id;
      data.duration = uploadResult.duration;
      data.width = uploadResult.width;
      data.height = uploadResult.height;
      data.format = uploadResult.format;
    }

    if (thumbnailFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(thumbnailFile, {
        folder: 'ecommerce-timor/videos/thumbnails',
        resource_type: 'image',
        quality: 'auto:good',
      });
      data.thumbnailUrl = uploadResult.secure_url;
      data.thumbnailPublicId = uploadResult.public_id;
    }

    const updated = await this.repo.update(id, data);

    // Only after the DB row is safely updated to the new asset — deleting
    // the old one first and having the DB write fail would leave the video
    // pointing at nothing. Best-effort: a failed cleanup here must never
    // fail the edit itself (the admin already has their new video saved).
    if (videoFile && (existing as any).videoPublicId) {
      this.cloudinaryService
        .deleteFile((existing as any).videoPublicId, 'video')
        .catch(() => undefined);
    }
    if (thumbnailFile && (existing as any).thumbnailPublicId) {
      this.cloudinaryService
        .deleteFile((existing as any).thumbnailPublicId, 'image')
        .catch(() => undefined);
    }

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
    if (dto.allowComments !== undefined) data.allowComments = this.parseBooleanString(dto.allowComments);
    if (dto.allowLikes !== undefined) data.allowLikes = this.parseBooleanString(dto.allowLikes);
    if (dto.allowSharing !== undefined) data.allowSharing = this.parseBooleanString(dto.allowSharing);
    if (dto.allowSave !== undefined) data.allowSave = this.parseBooleanString(dto.allowSave);
    if (dto.enableShopping !== undefined) data.enableShopping = this.parseBooleanString(dto.enableShopping);
    const updated = await this.repo.update(id, data);
    return updated;
  }

  async remove(id: number) {
    const existing = await this.findById(id);
    const deleted = await this.repo.delete(id);

    // Best-effort cleanup after the DB row is gone — same reasoning as
    // updateWithUpload: never let a Cloudinary hiccup block the delete
    // the admin actually asked for.
    if ((existing as any).videoPublicId) {
      this.cloudinaryService
        .deleteFile((existing as any).videoPublicId, 'video')
        .catch(() => undefined);
    }
    if ((existing as any).thumbnailPublicId) {
      this.cloudinaryService
        .deleteFile((existing as any).thumbnailPublicId, 'image')
        .catch(() => undefined);
    }

    return deleted;
  }

  async feed(query: any, viewerId?: number | null) {
    return this.repo.findFeed(query, viewerId);
  }

  async adminList(query: any) {
    return this.repo.findAllAdmin(query);
  }

  async adminStatusCounts() {
    return this.repo.countByStatus();
  }

  async adminListComments(query: any) {
    return this.repo.findAllComments(query);
  }

  async incrementAnalytics(id: number, action: 'views' | 'shares') {
    const video = await this.findById(id);
    if (action === 'shares' && !video.allowSharing) {
      throw new ForbiddenException('Sharing is disabled for this video');
    }
    return this.repo.incrementField(id, action);
  }

  // viewerKey identifies "who" for dedup purposes — a logged-in user's id,
  // or an anonymous visitor's IP, whichever the controller could resolve.
  // Repeat calls within the window are silently no-ops (still 200, never
  // surfaced as an error to the player) rather than genuinely incrementing
  // every time the endpoint is hit, since this route is @Public() and
  // otherwise trivially spammable by refreshing/re-calling it.
  async recordView(id: number, viewerKey: string) {
    const dedupKey = `video:view:${id}:${viewerKey}`;
    const alreadyCounted = await this.redisService.get(dedupKey);
    if (alreadyCounted) return { counted: false };

    await this.findById(id);
    await this.redisService.set(dedupKey, '1', VIEW_DEDUP_WINDOW_SECONDS);
    await this.repo.incrementField(id, 'views');
    return { counted: true };
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
    const video = await this.findById(id);
    if (!video.allowLikes) {
      throw new ForbiddenException('Likes are disabled for this video');
    }
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
    const video = await this.findById(id);
    if (!video.allowSave) {
      throw new ForbiddenException('Saving is disabled for this video');
    }
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
    const video = await this.findById(videoId);
    if (!video.allowComments) {
      throw new ForbiddenException('Comments are disabled for this video');
    }

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
