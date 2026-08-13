import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { FilterVideoDto } from './dto/filter-video.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('videos')
export class VideosController {
  constructor(private service: VideosService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  async getFeed(@Query() query: FilterVideoDto, @CurrentUser('id') userId?: number) {
    const { items, total } = await this.service.feed(query, userId);
    return { success: true, data: items, total };
  }

  // A logged-in user's saved/bookmarked videos. Must come before ':id' so
  // Nest doesn't try to parse "saved" as a numeric video id.
  @Get('saved')
  async getSaved(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.getSavedVideos(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, data: result.items, total: result.total };
  }

  // Admin video list — every video regardless of publish state, with
  // search/status filter/sort, for the Video Management table.
  @Roles(Role.ADMIN)
  @Get()
  async adminList(
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'draft' | 'all',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'views' | 'likes' | 'comments',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const result = await this.service.adminList({
      search,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy,
      sortOrder,
    });
    return { success: true, data: result.items, total: result.total };
  }

  // Admin comment moderation — every comment across every video. Must come
  // before ':id' so Nest doesn't parse "comments" as a numeric video id.
  @Roles(Role.ADMIN)
  @Get('comments')
  async adminListComments(
    @Query('search') search?: string,
    @Query('videoId') videoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.adminListComments({
      search,
      videoId: videoId ? parseInt(videoId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, data: result.items, total: result.total };
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId?: number) {
    const video = await this.service.findById(id, userId);
    return { success: true, data: video };
  }

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    @Body() dto: CreateVideoDto,
  ) {
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    if (!videoFile && !dto.videoUrl) {
      throw new BadRequestException('Video file or videoUrl is required');
    }

    const video = await this.service.createWithUpload(dto, videoFile, thumbnailFile);
    return { success: true, data: video };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    @Body() dto: UpdateVideoDto,
  ) {
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];
    const updated = await this.service.updateWithUpload(id, dto, videoFile, thumbnailFile);
    return { success: true, data: updated };
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }

  // ==================== Analytics ====================

  @Public()
  @Post(':id/view')
  async view(@Param('id', ParseIntPipe) id: number) {
    await this.service.incrementAnalytics(id, 'views');
    return { success: true };
  }

  @Public()
  @Post(':id/share')
  async share(@Param('id', ParseIntPipe) id: number) {
    await this.service.incrementAnalytics(id, 'shares');
    return { success: true };
  }

  @Public()
  @Get(':id/products')
  async getProducts(@Param('id', ParseIntPipe) id: number) {
    const products = await this.service.getVideoProducts(id);
    return { success: true, data: products };
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/recommendations')
  async getRecommendations(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId?: number) {
    const recommendations = await this.service.getRecommendations(id, userId);
    return { success: true, data: recommendations };
  }

  // ==================== Likes (per-user, auth required) ====================

  @Post(':id/like')
  async like(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.service.likeVideo(id, userId);
    return { success: true, data: result };
  }

  @Delete(':id/like')
  async unlike(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.service.unlikeVideo(id, userId);
    return { success: true, data: result };
  }

  // ==================== Saves / Bookmarks (auth required) ====================

  @Post(':id/save')
  async save(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.service.saveVideo(id, userId);
    return { success: true, data: result };
  }

  @Delete(':id/save')
  async unsave(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.service.unsaveVideo(id, userId);
    return { success: true, data: result };
  }

  // ==================== Comments ====================

  @Public()
  @Get(':id/comments')
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.getComments(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, data: result.items, total: result.total };
  }

  @Post(':id/comments')
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: number,
  ) {
    const comment = await this.service.addComment(id, userId, dto);
    return { success: true, data: comment };
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    await this.service.deleteComment(commentId, userId, role);
    return { success: true };
  }

  @Public()
  @Post('comments/:commentId/like')
  async likeComment(@Param('commentId', ParseIntPipe) commentId: number) {
    const comment = await this.service.likeComment(commentId);
    return { success: true, data: { likes: comment.likes } };
  }
}
