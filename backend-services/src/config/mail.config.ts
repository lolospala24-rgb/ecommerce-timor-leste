// placeholder for src/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  // SMTP Configuration
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  
  // Default sender
  from: {
    name: process.env.MAIL_FROM_NAME || 'E-commerce Timor-Leste',
    address: process.env.MAIL_FROM || 'noreply@ecommercetimor.com',
  },
  
  // Email templates
  templates: {
    welcome: 'welcome',
    orderConfirmation: 'order-confirmation',
    orderStatusUpdate: 'order-status-update',
    passwordReset: 'password-reset',
    emailVerification: 'email-verification',
    sellerVerification: 'seller-verification',
    sellerApproved: 'seller-approved',
    paymentConfirmation: 'payment-confirmation',
    shippingUpdate: 'shipping-update',
  },
  
  // Email subjects
  subjects: {
    welcome: 'Welcome to E-commerce Timor-Leste!',
    orderConfirmation: 'Order Confirmation - #{orderNumber}',
    orderStatusUpdate: 'Order #{orderNumber} Status Update',
    passwordReset: 'Reset Your Password',
    emailVerification: 'Verify Your Email Address',
    sellerVerification: 'Seller Account Verification',
    sellerApproved: 'Your Seller Account Has Been Approved!',
    paymentConfirmation: 'Payment Confirmation - #{orderNumber}',
    shippingUpdate: 'Your Order #{orderNumber} Has Been Shipped',
  },
  
  // Transport options
  transport: {
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 second
    rateLimit: 10, // 10 messages per second
  },
  
  // Development mode (don't actually send emails)
  preview: process.env.NODE_ENV !== 'production',
  
  // Test email recipient for development
  testRecipient: process.env.MAIL_TEST_RECIPIENT,
}));