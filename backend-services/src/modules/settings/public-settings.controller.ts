import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

// Deliberately separate from SettingsController (which is admin-only and
// returns the full row including SMTP credentials): anonymous storefront
// visitors need store info, tax/fee, payment method availability, and bank
// transfer details, and nothing else.
@Controller('settings')
@Public()
@Roles()
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  async getPublicSettings() {
    const settings = await this.settingsService.getPublicSettings();
    return { data: settings };
  }
}
