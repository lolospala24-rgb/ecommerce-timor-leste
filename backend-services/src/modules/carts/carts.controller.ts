// placeholder for src/modules/carts/carts.controller.ts
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
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  async getCart(@CurrentUser('id') userId: number) {
    const cart = await this.cartsService.getCart(userId);
    return { data: cart };
  }

  @Get('count')
  async getCartCount(@CurrentUser('id') userId: number) {
    const count = await this.cartsService.getCartCount(userId);
    return { data: { count } };
  }

  @Get('total')
  async getCartTotal(@CurrentUser('id') userId: number) {
    const total = await this.cartsService.getCartTotal(userId);
    return { data: { total } };
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  async addToCart(
    @CurrentUser('id') userId: number,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const cart = await this.cartsService.addToCart(userId, addToCartDto);
    return { message: 'Item added to cart', data: cart };
  }

  @Patch('update')
  async updateCartItem(
    @CurrentUser('id') userId: number,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.cartsService.updateCartItem(userId, updateCartDto);
    return { message: 'Cart updated', data: cart };
  }

  @Delete('item/:productId')
  @HttpCode(HttpStatus.OK)
  async removeFromCart(
    @CurrentUser('id') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('variantId') variantId?: string,
  ) {
    const cart = await this.cartsService.removeFromCart(
      userId,
      productId,
      variantId ? Number(variantId) : undefined,
    );
    return { message: 'Item removed from cart', data: cart };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser('id') userId: number) {
    await this.cartsService.clearCart(userId);
    return { message: 'Cart cleared successfully' };
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  async mergeCart(
    @CurrentUser('id') userId: number,
    @Body('items') items: any[],
  ) {
    const cart = await this.cartsService.mergeCart(userId, items);
    return { message: 'Carts merged successfully', data: cart };
  }

}