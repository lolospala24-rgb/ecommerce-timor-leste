import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { QuickMenuService } from './quick-menu.service';
import { CreateQuickMenuItemDto } from './dto/create-quick-menu-item.dto';
import { UpdateQuickMenuItemDto } from './dto/update-quick-menu-item.dto';
import { ReorderQuickMenuDto } from './dto/reorder-quick-menu.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { quickMenuIconMulterConfig } from '../../common/config/multer.config';

@Controller('quick-menu')
export class QuickMenuController {
  constructor(private readonly quickMenuService: QuickMenuService) {}

  @Public()
  @Get()
  async getActive() {
    const data = await this.quickMenuService.getActiveItems();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  async listForAdmin() {
    const data = await this.quickMenuService.listForAdmin();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async getForAdmin(@Param('id', ParseIntPipe) id: number) {
    const data = await this.quickMenuService.getForAdmin(id);
    return { data };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateQuickMenuItemDto) {
    const data = await this.quickMenuService.create(dto);
    return { message: 'Quick Menu item created', data };
  }

  // Must be registered before the generic `:id` PATCH route below, or
  // Nest/Express would try to parse "reorder" as a numeric id — same
  // ordering requirement as HeroController's own reorder route.
  @Roles(Role.ADMIN)
  @Patch('reorder')
  async reorder(@Body() dto: ReorderQuickMenuDto) {
    const data = await this.quickMenuService.reorder(dto);
    return { message: 'Quick Menu order updated', data };
  }

  // Returns just the uploaded icon's URL — the admin form attaches it via
  // create/update afterward, same two-step pattern as hero banner images.
  // The OLD icon (on replace) is intentionally NOT deleted here: this
  // endpoint only ever uploads a new asset, so a failed/abandoned form
  // submit never leaves the item pointing at a URL that got deleted out
  // from under it. See quick-menu.service.ts's remove()/update() for why
  // old-asset cleanup stays a manual admin concern for now rather than an
  // automatic delete-on-replace.
  @Roles(Role.ADMIN)
  @Post('upload-icon')
  @UseInterceptors(FileInterceptor('icon', quickMenuIconMulterConfig))
  async uploadIcon(@UploadedFile() file: Express.Multer.File) {
    const url = await this.quickMenuService.uploadIcon(file);
    return { message: 'Icon uploaded successfully', data: { url } };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuickMenuItemDto) {
    const data = await this.quickMenuService.update(id, dto);
    return { message: 'Quick Menu item updated', data };
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.quickMenuService.remove(id);
  }
}
