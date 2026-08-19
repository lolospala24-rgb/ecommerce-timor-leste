import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { HeroService } from './hero.service';
import { CreateHeroBannerDto } from './dto/create-hero-banner.dto';
import { UpdateHeroBannerDto } from './dto/update-hero-banner.dto';
import { ReorderHeroBannersDto } from './dto/reorder-hero-banners.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { multerConfig } from '../../common/config/multer.config';

@Controller('hero-banners')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Public()
  @Get()
  async getActive() {
    const data = await this.heroService.getActiveBanners();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  async listForAdmin() {
    const data = await this.heroService.listForAdmin();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async getForAdmin(@Param('id', ParseIntPipe) id: number) {
    const data = await this.heroService.getForAdmin(id);
    return { data };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateHeroBannerDto) {
    const data = await this.heroService.create(dto);
    return { message: 'Hero banner created', data };
  }

  // Must be registered before the generic `:id` PATCH route below, or
  // Nest/Express would try to parse "reorder" as a numeric id.
  @Roles(Role.ADMIN)
  @Patch('reorder')
  async reorder(@Body() dto: ReorderHeroBannersDto) {
    const data = await this.heroService.reorder(dto);
    return { message: 'Banner order updated', data };
  }

  @Roles(Role.ADMIN)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (type !== 'desktop' && type !== 'mobile') {
      throw new BadRequestException('type must be "desktop" or "mobile"');
    }
    const url = await this.heroService.uploadImage(file, type);
    return { message: 'Image uploaded successfully', data: { url } };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHeroBannerDto) {
    const data = await this.heroService.update(id, dto);
    return { message: 'Hero banner updated', data };
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.heroService.remove(id);
  }
}
