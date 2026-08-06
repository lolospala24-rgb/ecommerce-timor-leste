// placeholder for src/modules/payments/strategies/bank-transfer.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import 'multer';
import { PrismaService } from '../../../prisma/prisma.service';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class BankTransferStrategy {
  private readonly logger = new Logger(BankTransferStrategy.name);

  // Bank account information for Timor-Leste
  private readonly bankAccounts = {
    BNU: {
      bankName: 'Banco Nacional Ultramarino (BNU)',
      accountName: 'E-commerce Timor-Leste',
      accountNumber: '123456789',
      iban: 'TL12345678901234567890',
      swift: 'BNUTLTLD',
    },
    BCA: {
      bankName: 'BCA Timor-Leste',
      accountName: 'E-commerce Timor-Leste',
      accountNumber: '987654321',
      swift: 'BCALTLLD',
    },
  };

  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async processPayment(orderId: number, amount: number): Promise<any> {
    this.logger.log(`Processing Bank Transfer payment for order ${orderId}`);

    // Create pending payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
      },
    });

    this.logger.log(`Bank Transfer payment created for order ${orderId}`);

    return {
      payment,
      bankInstructions: this.getBankInstructions(amount, orderId),
    };
  }

  async uploadProof(paymentId: number, file: Express.Multer.File): Promise<string> {
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'ecommerce-timor/payments/bank-transfers',
      transformation: { width: 1000, quality: 85 },
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofImage: result.secure_url,
      },
    });

    this.logger.log(`Payment proof uploaded for payment ${paymentId}`);

    return result.secure_url;
  }

  async confirmPayment(paymentId: number, transactionId?: string): Promise<any> {
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        transactionId,
      },
    });

    this.logger.log(`Bank Transfer payment confirmed for payment ${paymentId}`);

    return updatedPayment;
  }

  async rejectPayment(paymentId: number, reason: string): Promise<any> {
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        notes: reason,
      },
    });

    this.logger.log(`Bank Transfer payment rejected for payment ${paymentId}`);

    return updatedPayment;
  }

  getBankInstructions(amount: number, orderId: number): any {
    return {
      message: 'Please transfer the exact amount to one of our bank accounts below. Upload the payment proof for confirmation.',
      amount,
      orderId,
      banks: Object.values(this.bankAccounts),
      instructions: [
        'Use the Order ID as payment reference',
        'Transfer the exact amount shown above',
        'Take a screenshot or photo of the transfer confirmation',
        'Upload the proof using the upload button below',
        'Payment will be confirmed within 1x24 hours',
      ],
    };
  }

  getBankInfo(): any {
    return {
      banks: Object.values(this.bankAccounts),
      notes: 'Please ensure you transfer to the correct bank account based on your preference.',
    };
  }
}