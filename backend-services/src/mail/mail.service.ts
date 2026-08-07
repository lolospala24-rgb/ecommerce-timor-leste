import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  orderConfirmationTemplate,
  orderStatusUpdateTemplate,
  paymentConfirmationTemplate,
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

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    const config = await this.resolveConfig();
    if (!config) {
      this.logger.warn(`Skipped sending "${subject}" to ${to}: no SMTP host configured`);
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user ? { user: config.user, pass: config.pass } : undefined,
      });

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Sent "${subject}" to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send "${subject}" to ${to}`, error as Error);
      return false;
    }
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

  async sendOrderStatusUpdate(email: string, name: string, order: any) {
    if (!(await this.isEnabled('sendShippingUpdate'))) return;
    const html = orderStatusUpdateTemplate({
      customerName: name,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
    });
    await this.send(email, `Order Update — ${order.orderNumber}`, html);
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

  async sendOrderCancelledEmail(..._args: any[]) {
    this.logger.debug(`sendOrderCancelledEmail`);
    return Promise.resolve();
  }

  async sendNotificationEmail(..._args: any[]) {
    this.logger.debug(`sendNotificationEmail`);
    return Promise.resolve();
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
