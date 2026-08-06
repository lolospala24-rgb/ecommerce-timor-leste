import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendEmailVerification(..._args: any[]) {
    this.logger.debug(`sendEmailVerification`);
    return Promise.resolve();
  }

  async sendPasswordResetEmail(..._args: any[]) {
    this.logger.debug(`sendPasswordResetEmail`);
    return Promise.resolve();
  }

  async sendOrderConfirmation(..._args: any[]) {
    this.logger.debug(`sendOrderConfirmation`);
    return Promise.resolve();
  }

  async sendNewOrderNotification(..._args: any[]) {
    this.logger.debug(`sendNewOrderNotification`);
    return Promise.resolve();
  }

  async sendOrderStatusUpdate(..._args: any[]) {
    this.logger.debug(`sendOrderStatusUpdate`);
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
  async sendPaymentConfirmation(..._args: any[]) {
    this.logger.debug(`sendPaymentConfirmation`);
    return Promise.resolve();
  }

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

  async sendWelcomeEmail(..._args: any[]) {
    this.logger.debug(`sendWelcomeEmail`);
    return Promise.resolve();
  }
}

export default MailService;
// placeholder for src/mail/mail.service.ts
