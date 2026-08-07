import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { MailService } from '../../mail/mail.service';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { TestEmailDto } from './dto/test-email.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/settings')
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getAdminSettings();
    return { data: settings };
  }

  @Post()
  async updateSettings(@Body() dto: SystemSettingsDto) {
    const settings = await this.settingsService.updateSettings(dto);
    return { message: 'Settings updated successfully', data: settings };
  }

  @Post('clear-cache')
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    const cleared = await this.settingsService.clearAppCache();
    return { message: `Cache cleared successfully (${cleared} keys removed)` };
  }

  @Post('clear-logs')
  @HttpCode(HttpStatus.OK)
  async clearLogs() {
    const removed = await this.settingsService.clearAdminLogs();
    return { message: `Logs cleared successfully (${removed} entries removed)` };
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() dto: TestEmailDto) {
    await this.mailService.sendTestEmail(dto.email);
    return { message: 'Test email sent successfully' };
  }
}
