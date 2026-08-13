import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { ResyncBalanceDto } from './dto/resync-balance.dto';
import { CreatePlatformAdjustmentDto } from './dto/create-platform-adjustment.dto';
import { RecordRemittanceDto } from './dto/record-remittance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, LedgerEntryType, PlatformLedgerType } from '@prisma/client';

// Every route here is the Admin Financial Command Center's data source —
// all admin-only, all read from (or, for adjustments, write through
// FinanceService into) the same Order/SellerBalance/SellerLedgerEntry
// tables the rest of the payment/payout/refund flow already uses. No
// endpoint here computes a financial figure independently.
@Controller('finance')
@Roles(Role.ADMIN)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  async getOverview(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const overview = await this.financeService.getOverview({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { data: overview };
  }

  @Get('ledger')
  async getGlobalLedger(
    @Query('sellerId') sellerId?: string,
    @Query('type') type?: LedgerEntryType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.getGlobalLedger({
      sellerId: sellerId ? parseInt(sellerId) : undefined,
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25,
    });
  }

  @Get('negative-balances')
  async getNegativeBalanceSellers() {
    const data = await this.financeService.getNegativeBalanceSellers();
    return { data };
  }

  @Get('reconciliation')
  async getReconciliation() {
    const result = await this.financeService.getReconciliation();
    return { data: result };
  }

  @Post('adjustments')
  async createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser('id') adminId: number) {
    const entry = await this.financeService.createAdjustment(
      dto.sellerId,
      dto.bucket,
      dto.amount,
      dto.reason,
      adminId,
    );
    return { message: 'Adjustment created', data: entry };
  }

  @Post('resync')
  async resyncBalance(@Body() dto: ResyncBalanceDto, @CurrentUser('id') adminId: number) {
    const entry = await this.financeService.resyncBalance(dto.sellerId, dto.bucket, dto.reason, adminId);
    return { message: 'Balance resynced', data: entry };
  }

  // ==========================================================================
  // Platform Ledger — where shipping/tax/commission collected from customers
  // actually sits, mirroring the seller endpoints above.
  // ==========================================================================

  @Get('platform-balance')
  async getPlatformBalance() {
    const data = await this.financeService.getPlatformBalance();
    return { data };
  }

  @Get('platform-ledger')
  async getPlatformLedger(
    @Query('type') type?: PlatformLedgerType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.getPlatformLedger({
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25,
    });
  }

  @Post('platform-remittance')
  async recordRemittance(@Body() dto: RecordRemittanceDto, @CurrentUser('id') adminId: number) {
    const entry = await this.financeService.recordPlatformRemittance(dto.bucket, dto.amount, dto.reason, adminId);
    return { message: 'Remittance recorded', data: entry };
  }

  @Post('platform-adjustments')
  async createPlatformAdjustment(@Body() dto: CreatePlatformAdjustmentDto, @CurrentUser('id') adminId: number) {
    const entry = await this.financeService.createPlatformAdjustment(dto.bucket, dto.amount, dto.reason, adminId);
    return { message: 'Platform adjustment created', data: entry };
  }
}
