// placeholder for src/modules/sellers/sellers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { SellersService } from './sellers.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { VerifySellerDto } from './dto/verify-seller.dto';
import { SellerFilterDto } from './dto/seller-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Role } from '@prisma/client';
import { multerConfig } from '../../common/config/multer.config';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerSellerDto: RegisterSellerDto) {
    const seller = await this.sellersService.register(registerSellerDto);
    return {
      message: 'Seller registration submitted. Awaiting admin verification.',
      data: seller,
    };
  }

  @Get('my-store')
  async getMyStore(@CurrentUser('id') userId: number) {
    const store = await this.sellersService.findByUserId(userId);
    return { data: store };
  }

  @Get('pending')
  @Roles(Role.ADMIN)
  async getPendingSellers() {
    const sellers = await this.sellersService.findPending();
    return { data: sellers };
  }

  @Public()
  @Get('verified')
  async getVerifiedSellers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.sellersService.findVerified({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
    });
    return result;
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query() filterDto: SellerFilterDto) {
    const result = await this.sellersService.findAll(filterDto);
    return result;
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  async getStats() {
    const stats = await this.sellersService.getStats();
    return { data: stats };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const seller = await this.sellersService.findOne(id);
    return { data: seller };
  }

  // Full detail (bank info, live balance, recent orders with customer
  // names) — admin-only. The public :id route above deliberately omits all
  // of this.
  @Get(':id/admin')
  @Roles(Role.ADMIN)
  async findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    const seller = await this.sellersService.findOneAdmin(id);
    return { data: seller };
  }

  @Patch('my-store')
  async updateMyStore(
    @CurrentUser('id') userId: number,
    @Body() updateSellerDto: UpdateSellerDto,
  ) {
    const seller = await this.sellersService.updateByUserId(userId, updateSellerDto);
    return { message: 'Store updated successfully', data: seller };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSellerDto: UpdateSellerDto,
  ) {
    const seller = await this.sellersService.update(id, updateSellerDto);
    return { message: 'Seller updated successfully', data: seller };
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async verifySeller(
    @Param('id', ParseIntPipe) id: number,
    @Body() verifySellerDto: VerifySellerDto,
    @CurrentUser('id') adminId: number,
  ) {
    const seller = await this.sellersService.verify(
      id,
      verifySellerDto.isApproved,
      adminId,
      verifySellerDto.rejectionReason,
    );
    return {
      message: verifySellerDto.isApproved ? 'Seller approved successfully' : 'Seller rejected',
      data: seller,
    };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
  ) {
    const seller = await this.sellersService.reject(id, reason, adminId);
    return { message: 'Seller rejected', data: seller };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sellersService.remove(id);
  }

  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  async uploadLogo(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoUrl = await this.sellersService.uploadLogo(userId, file);
    return { message: 'Logo uploaded successfully', data: { logoUrl } };
  }

  @Post('upload-banner')
  @UseInterceptors(FileInterceptor('banner', multerConfig))
  async uploadBanner(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const bannerUrl = await this.sellersService.uploadBanner(userId, file);
    return { message: 'Banner uploaded successfully', data: { bannerUrl } };
  }

  // Must come before ':id/products' etc. only insofar as it's its own
  // distinct path segment — Nest/Express matches by full path shape, so
  // ordering relative to ':id' below is fine either way here.
  @Post(':id/follow')
  async follow(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.sellersService.follow(id, userId);
    return { success: true, data: result };
  }

  @Delete(':id/follow')
  async unfollow(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const result = await this.sellersService.unfollow(id, userId);
    return { success: true, data: result };
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/follow-status')
  async getFollowStatus(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId?: number) {
    const result = await this.sellersService.getFollowStatus(id, userId);
    return { success: true, data: result };
  }

  @Public()
  @Get(':id/products')
  async getSellerProducts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.sellersService.getSellerProducts(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return result;
  }

  @Get(':id/orders')
  @Roles(Role.ADMIN)
  async getSellerOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.sellersService.getSellerOrders(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return result;
  }
}