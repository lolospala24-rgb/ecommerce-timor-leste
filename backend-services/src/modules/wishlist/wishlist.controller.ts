import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@CurrentUser('id') userId: number) {
    const wishlist = await this.wishlistService.getWishlist(userId);
    return { data: wishlist };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addToWishlist(
    @CurrentUser('id') userId: number,
    @Body() dto: AddToWishlistDto,
  ) {
    const wishlist = await this.wishlistService.addToWishlist(userId, dto);
    return { message: 'Added to wishlist', data: wishlist };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearWishlist(@CurrentUser('id') userId: number) {
    const wishlist = await this.wishlistService.clearWishlist(userId);
    return { message: 'Wishlist cleared', data: wishlist };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async removeFromWishlist(
    @CurrentUser('id') userId: number,
    @Query('productId', ParseIntPipe) productId: number,
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    const wishlist = await this.wishlistService.removeFromWishlist(
      userId,
      productId,
    );
    return { message: 'Removed from wishlist', data: wishlist };
  }
}
