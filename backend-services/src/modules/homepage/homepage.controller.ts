import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('homepage')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Public()
  @Get('sections')
  async getResolvedHomepage() {
    const data = await this.homepageService.getResolvedHomepage();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('sections/admin')
  async listForAdmin() {
    const data = await this.homepageService.listSectionsForAdmin();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('sections/admin/:id')
  async getForAdmin(@Param('id', ParseIntPipe) id: number) {
    const data = await this.homepageService.getSectionForAdmin(id);
    return { data };
  }

  @Roles(Role.ADMIN)
  @Post('sections')
  async create(@Body() dto: CreateSectionDto) {
    const data = await this.homepageService.createSection(dto);
    return { message: 'Homepage section created', data };
  }

  // Must be registered before the generic `sections/:id` PATCH route below,
  // or Nest/Express would try to parse "reorder" as a numeric section id.
  @Roles(Role.ADMIN)
  @Patch('sections/reorder')
  async reorder(@Body() dto: ReorderSectionsDto) {
    const data = await this.homepageService.reorderSections(dto);
    return { message: 'Section order updated', data };
  }

  @Roles(Role.ADMIN)
  @Patch('sections/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
    const data = await this.homepageService.updateSection(id, dto);
    return { message: 'Homepage section updated', data };
  }

  @Roles(Role.ADMIN)
  @Delete('sections/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.deleteSection(id);
  }
}
