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
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { ApproveRefundDto, RejectRefundDto } from './dto/process-refund.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, RefundStatus } from '@prisma/client';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post('order/:orderId')
  @HttpCode(HttpStatus.CREATED)
  async requestRefund(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RequestRefundDto,
    @CurrentUser('id') userId: number,
  ) {
    const refund = await this.refundsService.requestRefund(orderId, userId, dto.reason, dto.amount);
    return { message: 'Refund request submitted', data: refund };
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRefundDto,
    @CurrentUser('id') adminId: number,
  ) {
    const refund = await this.refundsService.approveRefund(id, adminId, dto.adminNote);
    return { message: 'Refund approved', data: refund };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRefundDto,
    @CurrentUser('id') adminId: number,
  ) {
    const refund = await this.refundsService.rejectRefund(id, adminId, dto.reason);
    return { message: 'Refund rejected', data: refund };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  async findAllForAdmin(
    @Query('status') status?: RefundStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.refundsService.findAllForAdmin({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('my-refunds')
  async findMyRefunds(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.refundsService.findMyRefunds(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get('order/:orderId')
  async findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const refunds = await this.refundsService.findByOrder(orderId, userId, userRole);
    return { data: refunds };
  }
}
