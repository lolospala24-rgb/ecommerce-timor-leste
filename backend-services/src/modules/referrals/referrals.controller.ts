import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { clampLimit } from '../../common/utils/pagination.util';

// Customer-facing — no @Public() anywhere here. The global JwtAuthGuard
// requires login, which is correct: every route below is scoped to the
// caller's own data via @CurrentUser('id').
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  async getMySummary(@CurrentUser('id') userId: number) {
    const data = await this.referralsService.getSummaryForUser(userId);
    return { data };
  }

  @Get('me/history')
  async getMyHistory(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.referralsService.listReferralHistoryForUser(
      userId,
      page ? parseInt(page, 10) : 1,
      clampLimit(limit, 20),
    );
    return { data };
  }

  @Get('me/:id')
  async getMyReferralDetail(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    const data = await this.referralsService.getReferralDetailForUser(userId, id);
    if (!data) {
      throw new NotFoundException('Referral not found');
    }
    return { data };
  }
}
