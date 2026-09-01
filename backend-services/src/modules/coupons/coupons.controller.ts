import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // For the public Deals page — a visitor doesn't need an account to see
  // what promotions exist, only to apply one at checkout. Route order
  // matters: this must come before ':id'-style routes so "public" isn't
  // parsed as an id, same reason /admin and /available are declared early.
  @Public()
  @Get('public')
  async listPublic() {
    const data = await this.couponsService.listPublicActive();
    return { data };
  }

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

  // Every coupon the customer could plausibly use, for the cart page's
  // "Available Coupons" list. Same auth rationale as /validate below.
  @Get('available')
  async listAvailable(@Query('subtotal') subtotal: string, @CurrentUser('id') userId: number) {
    const data = await this.couponsService.listAvailableForCustomer(userId, Number(subtotal) || 0);
    return { data };
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
