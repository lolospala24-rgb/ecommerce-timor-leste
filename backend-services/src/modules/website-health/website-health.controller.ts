import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WebsiteHealthService } from './website-health.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateWebsiteHealthSettingsDto } from './dto/update-settings.dto';
import { FilterIssuesDto } from './dto/filter-issues.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { clampLimit } from '../../common/utils/pagination.util';

// All routes ADMIN-only — this codebase's established RBAC model is
// role-based (Roles(Role.ADMIN) + the global RolesGuard), not a granular
// permission-string system, so this follows that existing convention
// rather than inventing website_health.view/run/etc. permission strings
// that no other module uses.
@Controller('website-health')
@Roles(Role.ADMIN)
export class WebsiteHealthController {
  constructor(private readonly websiteHealthService: WebsiteHealthService) {}

  @Get('settings')
  async getSettings() {
    const settings = await this.websiteHealthService.getSettings();
    return { data: settings };
  }

  @Put('settings')
  async updateSettings(@Body() dto: UpdateWebsiteHealthSettingsDto, @CurrentUser('id') adminId: number) {
    const settings = await this.websiteHealthService.updateSettings(dto, adminId);
    return { message: 'Settings updated', data: settings };
  }

  @Get('target-templates')
  getTargetTemplates() {
    return { data: this.websiteHealthService.getAuditTargetTemplates() };
  }

  // A human clicking "Run Audit" a handful of times a day is the only
  // expected caller — this limit exists purely to stop a scripted/buggy
  // client from hammering the endpoint, not to restrict normal use (the
  // real concurrency control is the single-in-flight-audit check inside
  // the service itself).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('audits')
  async startAudit(@Body() dto: CreateAuditDto, @CurrentUser('id') adminId: number) {
    const audit = await this.websiteHealthService.startAudit(dto, adminId);
    return { message: 'Audit started', data: audit };
  }

  @Get('audits')
  async listAudits(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.websiteHealthService.getAuditList(page ? parseInt(page, 10) : 1, clampLimit(limit, 20));
  }

  @Get('audits/:id')
  async getAudit(@Param('id', ParseIntPipe) id: number) {
    const audit = await this.websiteHealthService.getAuditDetail(id);
    return { data: audit };
  }

  @Get('audits/:id/issues')
  async getAuditIssues(@Param('id', ParseIntPipe) id: number, @Query() filters: FilterIssuesDto) {
    return this.websiteHealthService.getAuditIssues(id, filters);
  }

  @Get('audits/:id/metrics')
  async getAuditMetrics(@Param('id', ParseIntPipe) id: number) {
    const metrics = await this.websiteHealthService.getAuditMetrics(id);
    return { data: metrics };
  }

  @Post('audits/:id/cancel')
  async cancelAudit(@Param('id', ParseIntPipe) id: number) {
    const audit = await this.websiteHealthService.cancelAudit(id);
    return { message: 'Audit cancelled', data: audit };
  }

  @Post('audits/:id/retry')
  async retryAudit(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') adminId: number) {
    const audit = await this.websiteHealthService.retryAudit(id, adminId);
    return { message: 'Audit restarted', data: audit };
  }

  @Patch('issues/:id')
  async updateIssueStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIssueStatusDto) {
    const issue = await this.websiteHealthService.updateIssueStatus(id, dto.status);
    return { message: 'Issue updated', data: issue };
  }

  @Get('history')
  async getHistory(@Query('limit') limit?: string) {
    const history = await this.websiteHealthService.getHistory(clampLimit(limit, 30));
    return { data: history };
  }
}
