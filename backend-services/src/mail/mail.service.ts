import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  orderConfirmationTemplate,
  orderStatusUpdateTemplate,
  getOrderStatusEmailHeading,
  paymentConfirmationTemplate,
  notificationEmailTemplate,
  testEmailTemplate,
  welcomeEmailTemplate,
} from './mail-templates';

interface ResolvedMailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    // PrismaModule is @Global(), so this works without MailModule needing
    // to import SettingsModule — avoids a circular module dependency
    // (SettingsModule already imports MailModule for its test-email route).
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // DB-configured SMTP (set via the admin Settings > Email tab) wins when
  // present; otherwise falls back to the MAIL_* env vars so the app can
  // send mail out of the box without an admin having touched Settings yet.
  private async resolveConfig(): Promise<ResolvedMailConfig | null> {
    const settings = await this.prisma.systemSettings.findFirst();

    const host = settings?.smtpHost || this.configService.get<string>('MAIL_HOST');
    if (!host) {
      return null;
    }

    return {
      host,
      port: settings?.smtpHost
        ? settings.smtpPort
        : Number(this.configService.get('MAIL_PORT', 587)),
      secure: settings?.smtpHost ? settings.smtpSecure : false,
      user: settings?.smtpHost ? (settings.smtpUser ?? undefined) : this.configService.get<string>('MAIL_USER'),
      pass: settings?.smtpHost ? (settings.smtpPassword ?? undefined) : this.configService.get<string>('MAIL_PASS'),
      fromEmail: settings?.fromEmail || this.configService.get('MAIL_FROM', 'noreply@ecommercetimor.com'),
      fromName: settings?.fromName || 'E-commerce Timor-Leste',
    };
  }

  // Up to 3 attempts with a short backoff (1s, 2s) — covers the transient
  // failures (SMTP connection blip, momentary DNS hiccup) that a single
  // attempt has no chance against, without turning into a background queue.
  // A permanent failure (bad credentials, unresolvable host) fails the same
  // way on every attempt — that's an acceptable cost (a few extra seconds)
  // for not having to tell transient and permanent failures apart here.
  private static readonly SEND_MAX_ATTEMPTS = 3;

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    const config = await this.resolveConfig();
    if (!config) {
      this.logger.warn(`Skipped sending "${subject}" to ${to}: no SMTP host configured`);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });

    for (let attempt = 1; attempt <= MailService.SEND_MAX_ATTEMPTS; attempt++) {
      try {
        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to,
          subject,
          html,
        });

        this.logger.log(`Sent "${subject}" to ${to}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
        return true;
      } catch (error) {
        const isLastAttempt = attempt === MailService.SEND_MAX_ATTEMPTS;
        this.logger.error(
          `Failed to send "${subject}" to ${to} (attempt ${attempt}/${MailService.SEND_MAX_ATTEMPTS})`,
          error as Error,
        );
        if (isLastAttempt) return false;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    return false;
  }

  private async isEnabled(flag: 'sendOrderConfirmation' | 'sendPaymentConfirmation' | 'sendShippingUpdate' | 'sendWelcomeEmail') {
    const settings = await this.prisma.systemSettings.findFirst();
    // No row yet means defaults apply, and every one of these defaults to true.
    return settings ? settings[flag] : true;
  }

  async sendTestEmail(to: string) {
    const sent = await this.send(to, 'Test Email — E-commerce Timor-Leste', testEmailTemplate());
    if (!sent) {
      throw new Error('SMTP is not configured or the test send failed — check the server logs for details');
    }
  }

  async sendOrderConfirmation(email: string, name: string, order: any) {
    if (!(await this.isEnabled('sendOrderConfirmation'))) return;
    const html = orderConfirmationTemplate({
      customerName: name,
      orderNumber: order.orderNumber,
      items: (order.items ?? []).map((item: any) => ({
        name: item.product?.name ?? 'Item',
        quantity: item.quantity,
        total: item.total,
      })),
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      serviceFee: order.serviceFee,
      total: order.total,
    });
    await this.send(email, `Order Confirmed — ${order.orderNumber}`, html);
  }

  async sendPaymentConfirmation(email: string, name: string, order: any, payment: any) {
    if (!(await this.isEnabled('sendPaymentConfirmation'))) return;
    const html = paymentConfirmationTemplate({
      customerName: name,
      orderNumber: order.orderNumber,
      amount: payment.amount,
    });
    await this.send(email, `Payment Confirmed — ${order.orderNumber}`, html);
  }

  // `note` is passed explicitly rather than read off `order.notes` — the DB
  // field can hold a note left on an *earlier* status change (e.g. "handed
  // to courier" from when it moved to SHIPPING), which would be stale and
  // misleading if shown again on a later, unrelated status email. Callers
  // pass only the note that belongs to *this* transition.
  async sendOrderStatusUpdate(email: string, name: string, order: any, note?: string | null) {
    if (!(await this.isEnabled('sendShippingUpdate'))) return;
    const html = orderStatusUpdateTemplate({
      customerName: name,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      courier: order.courier,
      note: note ?? null,
      items: (order.items ?? []).map((item: any) => ({
        name: item.product?.name ?? 'Item',
        quantity: item.quantity,
        total: item.total,
      })),
      total: order.total,
    });
    await this.send(email, `${getOrderStatusEmailHeading(order.status)} — ${order.orderNumber}`, html);
  }

  async sendWelcomeEmail(email: string, name: string) {
    if (!(await this.isEnabled('sendWelcomeEmail'))) return;
    const html = welcomeEmailTemplate({ customerName: name });
    await this.send(email, 'Welcome to E-commerce Timor-Leste', html);
  }

  // The remaining notification types below aren't exposed as an admin
  // Settings toggle (only order confirmation, payment confirmation,
  // shipping/status updates, and the welcome email are), so they're left
  // as no-op stubs rather than guessing at content/scope beyond what was
  // asked for.
  async sendEmailVerification(..._args: any[]) {
    this.logger.debug(`sendEmailVerification`);
    return Promise.resolve();
  }

  async sendPasswordResetEmail(..._args: any[]) {
    this.logger.debug(`sendPasswordResetEmail`);
    return Promise.resolve();
  }

  async sendNewOrderNotification(..._args: any[]) {
    this.logger.debug(`sendNewOrderNotification`);
    return Promise.resolve();
  }

  async sendOrderCancelledEmail(email: string, name: string, order: any, reason?: string) {
    if (!(await this.isEnabled('sendShippingUpdate'))) return;
    const html = orderStatusUpdateTemplate({
      customerName: name,
      orderNumber: order.orderNumber,
      status: 'CANCELLED',
      trackingNumber: null,
      courier: null,
      note: reason ?? null,
      items: (order.items ?? []).map((item: any) => ({
        name: item.product?.name ?? 'Item',
        quantity: item.quantity,
        total: item.total,
      })),
      total: order.total,
    });
    await this.send(email, `${getOrderStatusEmailHeading('CANCELLED')} — ${order.orderNumber}`, html);
  }

  async sendNotificationEmail(
    to: string,
    name: string,
    title: string,
    message: string,
    _type: string,
    actionUrl?: string,
  ) {
    const html = notificationEmailTemplate({ customerName: name, title, message, actionUrl });
    await this.send(to, title, html);
  }

  // Review related
  async sendNewReviewNotification(..._args: any[]) {
    this.logger.debug(`sendNewReviewNotification`);
    return Promise.resolve();
  }

  async sendReviewApprovedEmail(..._args: any[]) {
    this.logger.debug(`sendReviewApprovedEmail`);
    return Promise.resolve();
  }

  async sendNewReviewNotificationToSeller(..._args: any[]) {
    this.logger.debug(`sendNewReviewNotificationToSeller`);
    return Promise.resolve();
  }

  async sendReviewRejectedEmail(..._args: any[]) {
    this.logger.debug(`sendReviewRejectedEmail`);
    return Promise.resolve();
  }

  async sendReviewReplyNotification(..._args: any[]) {
    this.logger.debug(`sendReviewReplyNotification`);
    return Promise.resolve();
  }

  // Seller related
  async sendSellerVerificationEmail(..._args: any[]) {
    this.logger.debug(`sendSellerVerificationEmail`);
    return Promise.resolve();
  }

  async sendSellerApprovedEmail(..._args: any[]) {
    this.logger.debug(`sendSellerApprovedEmail`);
    return Promise.resolve();
  }

  async sendSellerRejectedEmail(..._args: any[]) {
    this.logger.debug(`sendSellerRejectedEmail`);
    return Promise.resolve();
  }

  // Payment related
  async sendPaymentReceivedNotification(..._args: any[]) {
    this.logger.debug(`sendPaymentReceivedNotification`);
    return Promise.resolve();
  }

  async sendPaymentRejectedEmail(..._args: any[]) {
    this.logger.debug(`sendPaymentRejectedEmail`);
    return Promise.resolve();
  }

  async sendPaymentRefundEmail(..._args: any[]) {
    this.logger.debug(`sendPaymentRefundEmail`);
    return Promise.resolve();
  }
}

export default MailService;
