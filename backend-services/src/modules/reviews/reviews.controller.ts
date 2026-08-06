// placeholder for src/modules/reviews/reviews.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 5 }
  ]))
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @CurrentUser('id') userId: number,
  ) {
    const review = await this.reviewsService.create(
      createReviewDto,
      userId,
      files?.images || [],
    );
    return { message: 'Review submitted successfully. Awaiting approval.', data: review };
  }

  @Public()
  @Get('product/:productId')
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
    @Query('withImages') withImages?: string,
  ) {
    const result = await this.reviewsService.getProductReviews(productId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      rating: rating ? parseInt(rating) : undefined,
      withImages: withImages === 'true',
    });
    return result;
  }

  @Public()
  @Get('product/:productId/stats')
  async getReviewStats(@Param('productId', ParseIntPipe) productId: number) {
    const stats = await this.reviewsService.getReviewStats(productId);
    return { data: stats };
  }

  @Get('my-reviews')
  async getMyReviews(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.reviewsService.getUserReviews(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return result;
  }

  @Get('seller')
  @Roles(Role.SELLER)
  async getSellerReviews(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.reviewsService.getSellerReviews(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    });
    return result;
  }

  @Get('pending')
  @Roles(Role.ADMIN)
  async getPendingReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.reviewsService.getPendingReviews({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Get('stats')
  async getReviewStatsForUser(@CurrentUser('id') userId: number) {
    const stats = await this.reviewsService.getUserReviewStats(userId);
    return { data: stats };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const review = await this.reviewsService.findOne(id, userId, userRole);
    return { data: review };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser('id') userId: number,
  ) {
    const review = await this.reviewsService.update(id, updateReviewDto, userId);
    return { message: 'Review updated successfully', data: review };
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    const review = await this.reviewsService.approveReview(id, adminId);
    return { message: 'Review approved', data: review };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectReview(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
  ) {
    const review = await this.reviewsService.rejectReview(id, reason, adminId);
    return { message: 'Review rejected', data: review };
  }

  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  async markHelpful(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const result = await this.reviewsService.markHelpful(id, userId);
    return { message: 'Marked as helpful', data: result };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  async reportReview(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: number,
  ) {
    const result = await this.reviewsService.reportReview(id, reason, userId);
    return { message: 'Review reported', data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    await this.reviewsService.remove(id, userId, userRole);
  }

  @Post(':id/reply')
  @Roles(Role.SELLER)
  @HttpCode(HttpStatus.OK)
  async replyToReview(
    @Param('id', ParseIntPipe) id: number,
    @Body('reply') reply: string,
    @CurrentUser('id') userId: number,
  ) {
    const review = await this.reviewsService.replyToReview(id, reply, userId);
    return { message: 'Reply added', data: review };
  }

  @Delete(':id/reply')
  @Roles(Role.SELLER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteReply(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    const review = await this.reviewsService.deleteReply(id, userId, userRole);
    return { message: 'Reply deleted', data: review };
  }
}