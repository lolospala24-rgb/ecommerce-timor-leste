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
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { FilterVideoDto } from './dto/filter-video.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('videos')
export class VideosController {
  constructor(private service: VideosService) {}

  @Public()
  @Get('feed')
  async getFeed(@Query() query: FilterVideoDto) {
    const { items, total } = await this.service.feed(query);
    return { success: true, data: items, total };
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const video = await this.service.findById(id);
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

  // Analytics
  @Public()
  @Post(':id/view')
  async view(@Param('id', ParseIntPipe) id: number) {
    await this.service.incrementAnalytics(id, 'views');
    return { success: true };
  }

  @Public()
  @Post(':id/like')
  async like(@Param('id', ParseIntPipe) id: number) {
    await this.service.incrementAnalytics(id, 'likes');
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
  @Get(':id/recommendations')
  async getRecommendations(@Param('id', ParseIntPipe) id: number) {
    const recommendations = await this.service.getRecommendations(id);
    return { success: true, data: recommendations };
  }
}

