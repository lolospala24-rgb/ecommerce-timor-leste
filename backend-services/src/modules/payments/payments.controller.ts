// placeholder for src/modules/payments/payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('id') userId: number,
  ) {
    const payment = await this.paymentsService.create(createPaymentDto, userId);
    return { message: 'Payment initiated successfully', data: payment };
  }

  @Post(':id/confirm')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @CurrentUser('id') adminId: number,
  ) {
    const payment = await this.paymentsService.confirmPayment(
      id,
      confirmPaymentDto,
      adminId,
    );
    return { message: 'Payment confirmed successfully', data: payment };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
  ) {
    const payment = await this.paymentsService.rejectPayment(id, reason, adminId);
    return { message: 'Payment rejected', data: payment };
  }

  @Post('upload-proof')
  @UseInterceptors(FileInterceptor('proofImage'))
  async uploadPaymentProof(
    @UploadedFile() file: Express.Multer.File,
    @Body('paymentId') paymentId: string,
    @CurrentUser('id') userId: number,
  ) {
    const proofUrl = await this.paymentsService.uploadPaymentProof(
      parseInt(paymentId),
      file,
      userId,
    );
    return { message: 'Payment proof uploaded', data: { proofUrl } };
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.paymentsService.findAll(
      userId,
      userRole,
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
      },
    );
    return result;
  }

  @Get('my-payments')
  async getMyPayments(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.paymentsService.getUserPayments(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return result;
  }

  @Get('pending')
  @Roles(Role.ADMIN)
  async getPendingPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.paymentsService.getPendingPayments({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Get('stats')
  async getPaymentStats(@CurrentUser('id') userId: number) {
    const stats = await this.paymentsService.getPaymentStats(userId);
    return { data: stats };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const payment = await this.paymentsService.findOne(id, userId, userRole);
    return { data: payment };
  }

  @Get('order/:orderId')
  async getPaymentByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const payment = await this.paymentsService.getPaymentByOrder(orderId, userId, userRole);
    return { data: payment };
  }

  @Post(':id/refund')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
  ) {
    const payment = await this.paymentsService.refundPayment(id, reason, adminId);
    return { message: 'Payment refunded successfully', data: payment };
  }
}