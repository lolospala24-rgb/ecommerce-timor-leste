import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReferralsService } from './referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notifications.constants';

/**
 * Pays out QUALIFIED referrals whose hold period has cleared (and retries
 * CAPPED ones every tick, since a new calendar month may have freed up
 * their referrer's cap) — see ReferralsService.payoutDueReferrals for the
 * actual per-referral logic (hold check, monthly cap reservation, welcome
 * credit, reward credit). Mirrors DeliveryAutoConfirmJob's shape: a single
 * sweep call, admin alert if the whole sweep can't even run.
 */
@Injectable()
export class ReferralPayoutJob {
  private readonly logger = new Logger(ReferralPayoutJob.name);

  constructor(
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async sweepDueReferrals() {
    try {
      const result = await this.referralsService.payoutDueReferrals();
      if (result.processed > 0) {
        this.logger.log(
          `Referral payout sweep: ${result.processed} candidate(s), ${result.rewarded} rewarded, ${result.capped} capped, ${result.failed} failed`,
        );
      }
      if (result.failed > 0) {
        await this.alertAdmins(
          `Referral payout sweep had ${result.failed} failure(s)`,
          `Check the backend logs for the specific referral IDs and errors from ReferralsService.payoutDueReferrals.`,
        );
      }
    } catch (error) {
      // Can't even query candidates — the whole job is broken, not one
      // referral. Silent failure here means reward payouts just stop on
      // schedule with nobody the wiser, so this always pages an admin
      // rather than only logging to a container nobody tails.
      await this.alertAdmins(
        'ReferralPayoutJob could not run',
        `The referral payout sweep failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async alertAdmins(title: string, message: string) {
    try {
      await this.notificationsService.broadcastNotification({
        title,
        message,
        type: NotificationEvent.SYSTEM,
        priority: 'CRITICAL',
        userFilter: { role: 'ADMIN' },
        sendEmail: true,
      });
    } catch (notifyError) {
      this.logger.error(
        `Failed to notify admins about job failure: ${notifyError instanceof Error ? notifyError.message : notifyError}`,
      );
    }
  }
}
