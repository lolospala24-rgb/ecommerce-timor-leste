import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PageSpeedService } from './pagespeed.service';
import { SecurityAuditService } from './security-audit.service';
import { ScoreCalculatorService, SCORE_VERSION } from './score-calculator.service';
import { AUDIT_TARGET_TEMPLATES, DEFAULT_AUDIT_SCOPE } from './constants/audit-targets';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateWebsiteHealthSettingsDto } from './dto/update-settings.dto';
import { FilterIssuesDto } from './dto/filter-issues.dto';
import { AuditStatus, IssueCategory, IssueSeverity, MetricRating, Prisma } from '@prisma/client';

const AUDIT_ENGINE_VERSION = '1.0';

// The single orchestrator: Admin UI -> this service -> PageSpeedService /
// SecurityAuditService -> normalized results -> ScoreCalculatorService ->
// database (spec §17). No self-hosted headless browser and no active
// security scanner (OWASP ZAP etc.) run here — this production VPS has 2
// CPU cores and already serves live customer traffic, so real Lighthouse
// audits run on Google's infrastructure via PageSpeed Insights instead
// (see pagespeed.service.ts), and security checks are lightweight header/
// cookie/mixed-content inspection of the one allow-listed target domain
// (see security-audit.service.ts + ssrf-guard.util.ts). This is a
// deliberate, documented scope reduction from a full self-hosted
// Lighthouse+ZAP stack — see the final implementation report.
@Injectable()
export class WebsiteHealthService implements OnModuleInit {
  private readonly logger = new Logger(WebsiteHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pageSpeedService: PageSpeedService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly scoreCalculator: ScoreCalculatorService,
  ) {}

  // A hard process restart (deploy, crash) mid-audit would otherwise leave
  // a row stuck in RUNNING forever, permanently blocking the concurrency-1
  // guard in startAudit() below from ever letting a new audit start.
  async onModuleInit() {
    const stuck = await this.prisma.websiteAudit.updateMany({
      where: { status: { in: [AuditStatus.QUEUED, AuditStatus.RUNNING] } },
      data: {
        status: AuditStatus.FAILED,
        completedAt: new Date(),
        errorMessage: 'Audit interrupted by a server restart.',
      },
    });
    if (stuck.count > 0) {
      this.logger.warn(`Marked ${stuck.count} orphaned audit(s) as FAILED on startup.`);
    }
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------

  async getSettings() {
    const existing = await this.prisma.websiteHealthSettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;

    // First-run default — deliberately the real configured storefront
    // domain, never a placeholder like example.com, since that would let
    // the very first audit accidentally target something unintended.
    const defaultBaseUrl = process.env.AUDIT_BASE_URL || process.env.FRONTEND_URL || 'https://lolospala.com';
    return this.prisma.websiteHealthSettings.create({
      data: { id: 1, baseUrl: defaultBaseUrl, defaultScope: DEFAULT_AUDIT_SCOPE },
    });
  }

  async updateSettings(dto: UpdateWebsiteHealthSettingsDto, adminId: number) {
    const current = await this.getSettings();
    const next = {
      weightPerformance: dto.weightPerformance ?? current.weightPerformance,
      weightAccessibility: dto.weightAccessibility ?? current.weightAccessibility,
      weightBestPractices: dto.weightBestPractices ?? current.weightBestPractices,
      weightSeo: dto.weightSeo ?? current.weightSeo,
      weightSecurity: dto.weightSecurity ?? current.weightSecurity,
    };
    this.scoreCalculator.validateWeights({
      performance: next.weightPerformance,
      accessibility: next.weightAccessibility,
      bestPractices: next.weightBestPractices,
      seo: next.weightSeo,
      security: next.weightSecurity,
    });

    const updated = await this.prisma.websiteHealthSettings.update({
      where: { id: 1 },
      data: {
        ...(dto.baseUrl ? { baseUrl: dto.baseUrl } : {}),
        ...next,
        ...(dto.defaultScope ? { defaultScope: dto.defaultScope } : {}),
        ...(dto.timeoutSeconds ? { timeoutSeconds: dto.timeoutSeconds } : {}),
        ...(dto.retentionDays ? { retentionDays: dto.retentionDays } : {}),
        updatedBy: adminId,
      },
    });

    this.logger.log(`Website Health settings updated by admin ${adminId}`);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Running audits
  // ---------------------------------------------------------------------

  async startAudit(dto: CreateAuditDto, adminId: number) {
    const inFlight = await this.prisma.websiteAudit.findFirst({
      where: { status: { in: [AuditStatus.QUEUED, AuditStatus.RUNNING] } },
    });
    if (inFlight) {
      throw new ConflictException('An audit is already in progress. Please wait for it to finish.');
    }

    const settings = await this.getSettings();
    const scopeIds = dto.scope && dto.scope.length > 0 ? dto.scope : (settings.defaultScope as string[]);

    const audit = await this.prisma.websiteAudit.create({
      data: {
        status: AuditStatus.QUEUED,
        triggeredBy: adminId,
        baseUrl: settings.baseUrl,
        device: dto.device ?? 'mobile',
        auditEngineVersion: AUDIT_ENGINE_VERSION,
        scoreVersion: SCORE_VERSION,
      },
    });

    this.logger.log(`Audit ${audit.id} queued by admin ${adminId} (scope: ${scopeIds.join(', ')})`);

    // Deliberately not awaited — the HTTP response returns the queued
    // audit immediately (spec §17 "do not run long audits directly inside
    // a normal HTTP request"). No queue/worker infra (BullMQ etc.) exists
    // in this codebase yet, and PageSpeed Insights calls are I/O-bound
    // (waiting on Google), not CPU-heavy, so a detached async chain on
    // this same long-lived Node process is a proportional choice for this
    // phase rather than introducing new infrastructure — errors are
    // caught and always resolve the audit to FAILED, never an unhandled
    // rejection.
    this.runAudit(audit.id, scopeIds, settings).catch((error) => {
      this.logger.error(`Audit ${audit.id} crashed outside its own error handling: ${error?.message}`, error?.stack);
    });

    return audit;
  }

  private async runAudit(auditId: number, scopeIds: string[], settings: { baseUrl: string; timeoutSeconds: number; weightPerformance: number; weightAccessibility: number; weightBestPractices: number; weightSeo: number; weightSecurity: number }) {
    const allowedHost = new URL(settings.baseUrl).hostname;
    const timeoutMs = settings.timeoutSeconds * 1000;
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    await this.prisma.websiteAudit.update({
      where: { id: auditId },
      data: { status: AuditStatus.RUNNING, startedAt: new Date() },
    });
    this.emitProgress(auditId, { phase: 'starting', message: 'Preparing audit...', completed: 0, total: scopeIds.length });

    try {
      const resolvedTargets = await this.resolveTargets(scopeIds, settings.baseUrl);
      const device = (await this.prisma.websiteAudit.findUnique({ where: { id: auditId } }))?.device ?? 'mobile';

      const perTargetScores: Array<{ performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null }> = [];
      let securityScore: number | null = null;
      let completed = 0;

      for (const target of resolvedTargets) {
        this.emitProgress(auditId, {
          phase: 'running',
          message: `Analyzing ${target.label}...`,
          completed,
          total: resolvedTargets.length,
        });

        const dbTarget = await this.prisma.auditTarget.create({
          data: { auditId, url: target.url, route: target.route, pageType: target.pageType },
        });

        // Security headers are effectively site-wide (set by nginx/global
        // middleware, not per-route) — checked once against the first
        // target rather than redundantly on every page.
        if (securityScore === null) {
          try {
            const securityResult = await this.securityAuditService.auditUrl(target.url, allowedHost, timeoutMs);
            securityScore = securityResult.score;
            await this.storeIssues(
              auditId,
              null,
              securityResult.findings.map((f) => ({
                category: IssueCategory.SECURITY,
                ruleId: f.ruleId,
                severity: f.severity as IssueSeverity,
                title: f.title,
                description: f.description,
                recommendation: f.recommendation,
                affectedUrl: f.affectedUrl,
                evidence: f.evidence ?? null,
                documentationUrl: f.documentationUrl ?? null,
              })),
            );
          } catch (error) {
            this.logger.error(`Security audit failed for ${target.url}: ${(error as Error).message}`);
          }
        }

        try {
          const started = Date.now();
          const psiResult = await this.pageSpeedService.auditUrl(target.url, device as 'mobile' | 'desktop', apiKey, timeoutMs);
          const durationMs = Date.now() - started;

          perTargetScores.push(psiResult.scores);

          await this.prisma.auditTarget.update({
            where: { id: dbTarget.id },
            data: {
              durationMs,
              performanceScore: psiResult.scores.performance,
              accessibilityScore: psiResult.scores.accessibility,
              bestPracticesScore: psiResult.scores.bestPractices,
              seoScore: psiResult.scores.seo,
            },
          });

          await this.storeIssues(
            auditId,
            dbTarget.id,
            psiResult.issues.map((issue) => ({
              category: issue.category as IssueCategory,
              ruleId: issue.ruleId,
              severity: issue.severity as IssueSeverity,
              title: issue.title,
              description: issue.description,
              recommendation: issue.recommendation,
              affectedUrl: target.url,
              evidence: null,
              documentationUrl: issue.documentationUrl ?? null,
            })),
          );

          if (psiResult.metrics.length > 0) {
            await this.prisma.auditMetric.createMany({
              data: psiResult.metrics.map((m) => ({
                auditId,
                targetId: dbTarget.id,
                category: IssueCategory.PERFORMANCE,
                metricName: m.metricName,
                value: m.value,
                unit: m.unit,
                rating: (m.rating as MetricRating) ?? null,
              })),
            });
          }
        } catch (error) {
          this.logger.error(`PageSpeed audit failed for ${target.url}: ${(error as Error).message}`);
          perTargetScores.push({ performance: null, accessibility: null, bestPractices: null, seo: null });
        }

        completed += 1;
        this.emitProgress(auditId, {
          phase: 'running',
          message: `Analyzed ${target.label}`,
          completed,
          total: resolvedTargets.length,
        });
      }

      const performanceScore = this.scoreCalculator.averagePageScores(perTargetScores.map((s) => s.performance));
      const accessibilityScore = this.scoreCalculator.averagePageScores(perTargetScores.map((s) => s.accessibility));
      const bestPracticesScore = this.scoreCalculator.averagePageScores(perTargetScores.map((s) => s.bestPractices));
      const seoScore = this.scoreCalculator.averagePageScores(perTargetScores.map((s) => s.seo));

      const overallScore = this.scoreCalculator.calculateOverallScore(
        { performance: performanceScore, accessibility: accessibilityScore, bestPractices: bestPracticesScore, seo: seoScore, security: securityScore },
        {
          performance: settings.weightPerformance,
          accessibility: settings.weightAccessibility,
          bestPractices: settings.weightBestPractices,
          seo: settings.weightSeo,
          security: settings.weightSecurity,
        },
      );

      await this.prisma.websiteAudit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.COMPLETED,
          completedAt: new Date(),
          performanceScore,
          accessibilityScore,
          bestPracticesScore,
          seoScore,
          securityScore,
          overallScore,
        },
      });

      this.emitProgress(auditId, { phase: 'completed', message: 'Audit completed successfully.', completed: resolvedTargets.length, total: resolvedTargets.length });
      this.logger.log(`Audit ${auditId} completed — overall score ${overallScore}`);
    } catch (error) {
      const message = (error as Error).message || 'Unknown error';
      await this.prisma.websiteAudit.update({
        where: { id: auditId },
        data: { status: AuditStatus.FAILED, completedAt: new Date(), errorMessage: message },
      });
      this.emitProgress(auditId, { phase: 'failed', message, completed: 0, total: 0 });
      this.logger.error(`Audit ${auditId} failed: ${message}`, (error as Error).stack);
    }
  }

  private async resolveTargets(scopeIds: string[], baseUrl: string) {
    const targets: Array<{ id: string; label: string; route: string; url: string; pageType: string }> = [];

    for (const id of scopeIds) {
      const template = AUDIT_TARGET_TEMPLATES.find((t) => t.id === id);
      if (!template) continue;

      if (template.id === 'product-detail') {
        const product = await this.prisma.product.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { slug: true },
        });
        if (!product) {
          this.logger.warn('Skipping product-detail audit target — no active product found.');
          continue;
        }
        const route = `/products/${product.slug}`;
        targets.push({ id, label: template.label, route, url: new URL(route, baseUrl).toString(), pageType: template.pageType });
        continue;
      }

      targets.push({
        id,
        label: template.label,
        route: template.route,
        url: new URL(template.route, baseUrl).toString(),
        pageType: template.pageType,
      });
    }

    if (targets.length === 0) {
      throw new BadRequestException('No valid audit targets resolved for the requested scope.');
    }
    return targets;
  }

  private async storeIssues(
    auditId: number,
    targetId: number | null,
    issues: Array<{
      category: IssueCategory;
      ruleId: string;
      severity: IssueSeverity;
      title: string;
      description: string;
      recommendation: string;
      affectedUrl: string;
      evidence: string | null;
      documentationUrl: string | null;
    }>,
  ) {
    if (issues.length === 0) return;
    await this.prisma.auditIssue.createMany({
      data: issues.map((issue) => ({ auditId, targetId, ...issue })),
    });
  }

  private emitProgress(auditId: number, payload: { phase: string; message: string; completed: number; total: number }) {
    // Reuses the existing authenticated NotificationsGateway (spec §30 —
    // "if the application supports WebSockets, use the existing
    // infrastructure") rather than a new gateway. Admin-only dashboard, so
    // the existing `admins` room is the correct audience.
    this.notificationsGateway.server?.to('admins').emit('website-health:progress', { auditId, ...payload });
  }

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  async cancelAudit(id: number) {
    const audit = await this.prisma.websiteAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.status !== AuditStatus.RUNNING && audit.status !== AuditStatus.QUEUED) {
      throw new BadRequestException('Only a queued or running audit can be cancelled.');
    }
    return this.prisma.websiteAudit.update({
      where: { id },
      data: { status: AuditStatus.CANCELLED, completedAt: new Date() },
    });
  }

  async retryAudit(id: number, adminId: number) {
    const audit = await this.prisma.websiteAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Audit not found');
    // A fresh audit row, not a mutation of the failed one — historical
    // failed reports stay exactly as they were (spec §42).
    return this.startAudit({ device: audit.device as 'mobile' | 'desktop' }, adminId);
  }

  async getAuditList(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.websiteAudit.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.websiteAudit.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAuditDetail(id: number) {
    const audit = await this.prisma.websiteAudit.findUnique({
      where: { id },
      include: {
        targets: true,
        _count: { select: { issues: true } },
      },
    });
    if (!audit) throw new NotFoundException('Audit not found');

    const issueCounts = await this.prisma.auditIssue.groupBy({
      by: ['severity'],
      where: { auditId: id },
      _count: true,
    });

    return {
      ...audit,
      rating: audit.overallScore !== null ? this.scoreCalculator.ratingForScore(audit.overallScore) : null,
      issueCounts: issueCounts.reduce((acc, row) => ({ ...acc, [row.severity]: row._count }), {} as Record<string, number>),
    };
  }

  async getAuditIssues(id: number, filters: FilterIssuesDto) {
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 20;

    const where: Prisma.AuditIssueWhereInput = { auditId: id };
    if (filters.category) where.category = filters.category as IssueCategory;
    if (filters.severity) where.severity = filters.severity as IssueSeverity;
    if (filters.status) where.status = filters.status as any;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { ruleId: { contains: filters.search } },
        { affectedUrl: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditIssue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditIssue.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAuditMetrics(id: number) {
    return this.prisma.auditMetric.findMany({ where: { auditId: id } });
  }

  async updateIssueStatus(issueId: number, status: 'OPEN' | 'RESOLVED' | 'IGNORED') {
    const issue = await this.prisma.auditIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');
    return this.prisma.auditIssue.update({ where: { id: issueId }, data: { status: status as any } });
  }

  async getHistory(limit = 30) {
    const audits = await this.prisma.websiteAudit.findMany({
      where: { status: AuditStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        overallScore: true,
        performanceScore: true,
        accessibilityScore: true,
        bestPracticesScore: true,
        seoScore: true,
        securityScore: true,
      },
    });
    return audits.reverse(); // chronological order for trend charts
  }

  getAuditTargetTemplates() {
    return AUDIT_TARGET_TEMPLATES.map(({ id, label, pageType }) => ({ id, label, pageType }));
  }
}
