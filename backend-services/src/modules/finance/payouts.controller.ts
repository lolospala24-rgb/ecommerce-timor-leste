import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { RequestPayoutDto, ApprovePayoutDto, RejectPayoutDto, AdminCreatePayoutDto } from './dto/payout.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, PayoutStatus } from '@prisma/client';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('my-balance')
  @Roles(Role.SELLER)
  async getMyBalance(@CurrentUser('id') userId: number) {
    const balance = await this.payoutsService.getMyBalance(userId);
    return { data: balance };
  }

  @Get('my-ledger')
  @Roles(Role.SELLER)
  async getMyLedger(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payoutsService.getMyLedger(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('request')
  @Roles(Role.SELLER)
  @HttpCode(HttpStatus.CREATED)
  async requestPayout(@CurrentUser('id') userId: number, @Body() dto: RequestPayoutDto) {
    const payout = await this.payoutsService.requestPayout(userId, dto.amount);
    return { message: 'Payout requested', data: payout };
  }

  @Get('my-payouts')
  @Roles(Role.SELLER)
  async findMyPayouts(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payoutsService.findMyPayouts(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  async findAllForAdmin(
    @Query('status') status?: PayoutStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payoutsService.findAllForAdmin({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('admin/:sellerId/balance')
  @Roles(Role.ADMIN)
  async getSellerBalanceForAdmin(@Param('sellerId', ParseIntPipe) sellerId: number) {
    const balance = await this.payoutsService.getSellerBalanceForAdmin(sellerId);
    return { data: balance };
  }

  @Get('admin/:sellerId/ledger')
  @Roles(Role.ADMIN)
  async getSellerLedgerForAdmin(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payoutsService.getSellerLedgerForAdmin(sellerId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('admin/:sellerId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async adminCreatePayout(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Body() dto: AdminCreatePayoutDto,
    @CurrentUser('id') adminId: number,
  ) {
    const payout = await this.payoutsService.adminCreatePayout(sellerId, dto.amount, adminId);
    return { message: 'Payout created', data: payout };
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approvePayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovePayoutDto,
    @CurrentUser('id') adminId: number,
  ) {
    const payout = await this.payoutsService.approvePayout(id, adminId, dto.adminNote);
    return { message: 'Payout approved', data: payout };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectPayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPayoutDto,
    @CurrentUser('id') adminId: number,
  ) {
    const payout = await this.payoutsService.rejectPayout(id, adminId, dto.reason);
    return { message: 'Payout rejected', data: payout };
  }

  @Post(':id/mark-paid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async markPaid(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') adminId: number) {
    const payout = await this.payoutsService.markPaid(id, adminId);
    return { message: 'Payout marked as paid', data: payout };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const payout = await this.payoutsService.findOne(id, userId, userRole);
    return { data: payout };
  }
}
