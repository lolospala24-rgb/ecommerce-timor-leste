import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ProductTypeRequestsService } from './product-type-requests.service';
import { CreateProductTypeRequestDto } from './dto/create-product-type-request.dto';
import { ApproveProductTypeRequestDto } from './dto/approve-product-type-request.dto';
import { RejectProductTypeRequestDto } from './dto/reject-product-type-request.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('product-type-requests')
export class ProductTypeRequestsController {
  constructor(private readonly service: ProductTypeRequestsService) {}

  @Post()
  @Roles(Role.SELLER)
  async create(@CurrentUser('id') userId: number, @Body() dto: CreateProductTypeRequestDto) {
    const request = await this.service.create(userId, dto);
    return { message: 'Product type request submitted for review', data: request };
  }

  @Get('my-requests')
  @Roles(Role.SELLER)
  async findMyRequests(
    @CurrentUser('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.findMyRequests(userId, { page, limit });
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.service.findAll({ page, limit, status });
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: ApproveProductTypeRequestDto,
  ) {
    const result = await this.service.approve(id, adminId, dto);
    return { message: 'Product type request approved', data: result };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: RejectProductTypeRequestDto,
  ) {
    const request = await this.service.reject(id, adminId, dto.reason);
    return { message: 'Product type request rejected', data: request };
  }
}
