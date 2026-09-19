import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, NotFoundException } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { clampLimit } from '../../common/utils/pagination.util';
import { Role } from '@prisma/client';

@Roles(Role.ADMIN)
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // Route order matters — 'stats'/'settings' must be declared before the
  // ':id' route below, same reason /admin and /available are declared
  // early in CouponsController.
  @Get('stats')
  async getStats() {
    const data = await this.referralsService.getAdminStats();
    return { data };
  }

  @Get('settings')
  async getSettings() {
    const data = await this.referralsService.getReferralSettings();
    return { data };
  }

  @Patch('settings')
  async updateSettings(@Body() dto: UpdateReferralSettingsDto) {
    const data = await this.referralsService.updateReferralSettings(dto);
    return { message: 'Referral settings updated successfully', data };
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'PENDING' | 'REWARDED',
  ) {
    const data = await this.referralsService.listForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: clampLimit(limit, 20),
      status,
    });
    return { data };
  }

  @Get(':id')
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    const data = await this.referralsService.getForAdminDetail(id);
    if (!data) {
      throw new NotFoundException('Referral not found');
    }
    return { data };
  }
}
