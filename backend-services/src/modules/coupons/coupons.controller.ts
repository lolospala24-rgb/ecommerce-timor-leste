import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Roles(Role.ADMIN)
  @Get('admin')
  async listForAdmin() {
    const data = await this.couponsService.listForAdmin();
    return { data };
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async getForAdmin(@Param('id', ParseIntPipe) id: number) {
    const data = await this.couponsService.getForAdmin(id);
    return { data };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateCouponDto) {
    const data = await this.couponsService.create(dto);
    return { message: 'Coupon created', data };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponDto) {
    const data = await this.couponsService.update(id, dto);
    return { message: 'Coupon updated', data };
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }

  // No @Public() — the global JwtAuthGuard requires login here, which is
  // correct: validating needs a real userId to check per-user usage
  // limits, and an anonymous visitor would have to log in to check out
  // anyway. Throttled to blunt brute-force guessing of valid codes.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('validate')
  async validate(@Body() dto: ValidateCouponDto, @CurrentUser('id') userId: number) {
    const { coupon, discountAmount } = await this.couponsService.validateForCustomer(
      dto.code,
      userId,
      dto.subtotal,
    );
    return {
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      },
    };
  }
}
