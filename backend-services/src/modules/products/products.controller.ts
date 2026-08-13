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
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { multerConfig } from '../../common/config/multer.config';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ============================================
  // PRODUCT CRUD
  // ============================================

  @Post()
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('id') userId: number,
  ) {
    const dto = plainToInstance(CreateProductDto, createProductDto);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const messages = errors.map(
        (error) => Object.values(error.constraints || {}).join(', ')
      );
      throw new BadRequestException(messages.join('; '));
    }

    const product = await this.productsService.create(
      dto,
      userId,
      files || [],
    );
    return { message: 'Product created successfully', data: product };
  }

  @Public()
  @Get()
  async findAll(@Query() filterDto: FilterProductDto) {
    const result = await this.productsService.findAll(filterDto);
    return result;
  }

  @Public()
  @Get('featured')
  async getFeaturedProducts(@Query('limit') limit?: string) {
    const products = await this.productsService.getFeaturedProducts(
      limit ? parseInt(limit) : 10,
    );
    return { data: products };
  }

  @Public()
  @Get('new-arrivals')
  async getNewArrivals(@Query('limit') limit?: string) {
    const products = await this.productsService.getNewArrivals(
      limit ? parseInt(limit) : 10,
    );
    return { data: products };
  }

  @Public()
  @Get('best-sellers')
  async getBestSellers(@Query('limit') limit?: string) {
    const products = await this.productsService.getBestSellers(
      limit ? parseInt(limit) : 10,
    );
    return { data: products };
  }

  @Public()
  @Get('popular')
  async getPopularProducts(@Query('limit') limit?: string) {
    const limitValue = limit ? parseInt(limit, 10) : 10;
    const products = await this.productsService.getPopularProducts(
      Number.isNaN(limitValue) ? 10 : limitValue,
    );
    return { data: products };
  }

  @Public()
  @Get('local')
  async getLocalProducts(@Query('limit') limit?: string) {
    const result = await this.productsService.getLocalProducts(
      limit ? parseInt(limit) : 10,
    );
    return { data: result };
  }

  @Get('my-products')
  @Roles(Role.SELLER)
  async getMyProducts(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.productsService.getSellerProducts(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    });
    return result;
  }

  @Public()
  @Get('search')
  async searchProducts(@Query('q') query: string, @Query('limit') limit?: string) {
    const products = await this.productsService.searchProducts(
      query,
      limit ? parseInt(limit) : 20,
    );
    return { data: products };
  }

  @Public()
  @Get('category/:categoryId')
  async getProductsByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.productsService.getProductsByCategory(categoryId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Public()
  @Get('seller/:sellerId')
  async getProductsBySeller(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.productsService.getProductsBySeller(sellerId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return await this.productsService.findBySlug(slug);
  }

  @Patch(':id')
  @Roles(Role.SELLER, Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('id') userId: number,
  ) {
    const product = await this.productsService.update(id, updateProductDto, userId);
    return { message: 'Product updated successfully', data: product };
  }

  @Delete(':id')
  @Roles(Role.SELLER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.productsService.remove(id, userId);
  }

  @Post(':id/force-delete')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async forceDelete(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.forceRemove(id);
    return { message: 'Product deactivated successfully' };
  }

  @Post(':id/images')
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  async addImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: number,
  ) {
    const images = await this.productsService.addImages(id, files, userId);
    return { message: 'Images added successfully', data: { images } };
  }

  @Delete(':id/images/:imageIndex')
  @Roles(Role.SELLER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageIndex', ParseIntPipe) imageIndex: number,
    @CurrentUser('id') userId: number,
  ) {
    const product = await this.productsService.removeImage(id, imageIndex, userId);
    return { message: 'Image removed successfully', data: product };
  }

  @Post(':id/stock')
  @Roles(Role.SELLER, Role.ADMIN)
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity') quantity: number,
    @Body('type') type: 'add' | 'subtract' | 'set',
    @CurrentUser('id') userId: number,
  ) {
    const product = await this.productsService.updateStock(id, quantity, type, userId);
    return { message: 'Stock updated successfully', data: product };
  }

  @Post(':id/toggle-status')
  @Roles(Role.SELLER, Role.ADMIN)
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const product = await this.productsService.toggleStatus(id, userId);
    return { message: 'Product status toggled', data: product };
  }

  @Post(':id/clone')
  @Roles(Role.SELLER)
  async cloneProduct(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const product = await this.productsService.cloneProduct(id, userId);
    return { message: 'Product cloned successfully', data: product };
  }

  @Get(':id/reviews')
  @Public()
  async getProductReviews(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.productsService.getProductReviews(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
    return result;
  }

  @Get(':id/related')
  @Public()
  async getRelatedProducts(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const products = await this.productsService.getRelatedProducts(
      id,
      limit ? parseInt(limit) : 5,
    );
    return { data: products };
  }

  // ============================================
  // PRODUCT VARIANTS
  // ============================================

  @Post(':id/variants')
  @Roles(Role.SELLER, Role.ADMIN)
  async createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() createVariantDto: CreateVariantDto,
    @CurrentUser('id') userId: number,
  ) {
    const variant = await this.productsService.createVariant(id, createVariantDto, userId);
    return { message: 'Variant created successfully', data: variant };
  }

  @Public()
  @Get(':id/variants')
  async getVariants(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId?: number,
  ) {
    const variants = await this.productsService.getVariants(id, userId);
    return { data: variants };
  }

  @Public()
  @Get('variants/:variantId')
  async getVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentUser('id') userId?: number,
  ) {
    const variant = await this.productsService.getVariant(variantId, userId);
    return { data: variant };
  }

  @Patch(':id/variants/:variantId')
  @Roles(Role.SELLER, Role.ADMIN)
  async updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() updateVariantDto: UpdateVariantDto,
    @CurrentUser('id') userId: number,
  ) {
    const variant = await this.productsService.updateVariant(id, variantId, updateVariantDto, userId);
    return { message: 'Variant updated successfully', data: variant };
  }

  @Delete(':id/variants/:variantId')
  @Roles(Role.SELLER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.productsService.deleteVariant(id, variantId, userId);
    return { message: 'Variant deleted successfully' };
  }

  @Post(':id/variants/:variantId/toggle-status')
  @Roles(Role.SELLER, Role.ADMIN)
  async toggleVariantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentUser('id') userId: number,
  ) {
    const variant = await this.productsService.toggleVariantStatus(id, variantId, userId);
    return { message: 'Variant status toggled', data: variant };
  }

  // ============================================
  // PRODUCT TYPES
  // ============================================

  @Post('types')
  @Roles(Role.ADMIN)
  async createProductType(@Body() createProductTypeDto: CreateProductTypeDto) {
    const type = await this.productsService.createProductType(createProductTypeDto);
    return { message: 'Product type created successfully', data: type };
  }

  @Public()
  @Get('types')
  async getAllProductTypes() {
    const types = await this.productsService.getAllProductTypes();
    return { data: types };
  }

  @Public()
  @Get('types/:id')
  async getProductType(@Param('id', ParseIntPipe) id: number) {
    const type = await this.productsService.getProductType(id);
    return { data: type };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.productsService.findOne(id);
  }

  @Patch('types/:id')
  @Roles(Role.ADMIN)
  async updateProductType(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductTypeDto: UpdateProductTypeDto,
  ) {
    const type = await this.productsService.updateProductType(id, updateProductTypeDto);
    return { message: 'Product type updated successfully', data: type };
  }

  @Delete('types/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductType(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.deleteProductType(id);
    return { message: 'Product type deleted successfully' };
  }

  @Post('types/:id/toggle-status')
  @Roles(Role.ADMIN)
  async toggleProductTypeStatus(@Param('id', ParseIntPipe) id: number) {
    const type = await this.productsService.toggleProductTypeStatus(id);
    return { message: 'Product type status toggled', data: type };
  }
}