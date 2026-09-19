import { Controller, Get, Query } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { clampLimit } from '../../common/utils/pagination.util';

@Controller('wallet')
export class WalletController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  async getMyWallet(@CurrentUser('id') userId: number) {
    const data = await this.referralsService.getWalletForUser(userId);
    return { data };
  }

  @Get('transactions')
  async getMyWalletTransactions(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.referralsService.listWalletTransactionsForUser(
      userId,
      page ? parseInt(page, 10) : 1,
      clampLimit(limit, 20),
    );
    return { data };
  }
}
