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
  DefaultValuePipe,
} from '@nestjs/common';
import { PromotionsService, PromotionStatus } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // ---- Admin (view + deactivate only — no create/edit here) ----
  // Declared before ':id'-style seller routes so 'admin' is never parsed
  // as an :id, same route-ordering convention as coupons.controller.ts.

  @Roles(Role.ADMIN)
  @Get('admin')
  async findAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PromotionStatus,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.promotionsService.findAllForAdmin({
      page,
      limit,
      status,
      sellerId: sellerId ? Number(sellerId) : undefined,
    });
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/deactivate')
  async deactivateForAdmin(@Param('id', ParseIntPipe) id: number) {
    const data = await this.promotionsService.deactivateForAdmin(id);
    return { message: 'Promotion deactivated', data };
  }

  // ---- Seller ----

  @Roles(Role.SELLER)
  @Post()
  async create(@CurrentUser('id') userId: number, @Body() dto: CreatePromotionDto) {
    const data = await this.promotionsService.create(userId, dto);
    return { message: 'Promotion created', data };
  }

  @Roles(Role.SELLER)
  @Get('mine')
  async findMine(
    @CurrentUser('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PromotionStatus,
  ) {
    return this.promotionsService.findMine(userId, { page, limit, status });
  }

  @Roles(Role.SELLER)
  @Get('conflicts')
  async checkConflicts(
    @CurrentUser('id') userId: number,
    @Query('productIds') productIds: string,
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const ids = (productIds ?? '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v));
    const data = await this.promotionsService.checkConflicts(userId, {
      productIds: ids,
      startAt,
      endAt,
      excludeId: excludeId ? Number(excludeId) : undefined,
    });
    return { data };
  }

  @Roles(Role.SELLER)
  @Get(':id')
  async findOne(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    const data = await this.promotionsService.findOne(userId, id);
    return { data };
  }

  @Roles(Role.SELLER)
  @Patch(':id')
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    const data = await this.promotionsService.update(userId, id, dto);
    return { message: 'Promotion updated', data };
  }

  @Roles(Role.SELLER)
  @Patch(':id/deactivate')
  async deactivate(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    const data = await this.promotionsService.deactivate(userId, id);
    return { message: 'Promotion deactivated', data };
  }

  @Roles(Role.SELLER)
  @Delete(':id')
  async remove(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    await this.promotionsService.remove(userId, id);
    return { message: 'Promotion deleted' };
  }
}
