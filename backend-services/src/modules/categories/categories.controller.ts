// placeholder for src/modules/categories/categories.controller.ts
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryProductsQueryDto } from './dto/category-products-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return { message: 'Category created successfully', data: category };
  }

  @Public()
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('includeProducts') includeProducts?: string,
  ) {
    const result = await this.categoriesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      parentId: parentId ? parseInt(parentId) : undefined,
      includeProducts: includeProducts === 'true',
    });
    return result;
  }

  @Public()
  @Get('tree')
  async getCategoryTree() {
    const tree = await this.categoriesService.getCategoryTree();
    return { data: tree };
  }

  @Public()
  @Get('featured')
  async getFeaturedCategories() {
    const categories = await this.categoriesService.getFeaturedCategories();
    return { data: categories };
  }

  @Public()
  @Get('with-products')
  async getCategoriesWithProducts() {
    const categories = await this.categoriesService.getCategoriesWithProducts();
    return { data: categories };
  }

  @Public()
  @Get('menu')
  async getMenuCategories() {
    const categories = await this.categoriesService.getMenuCategories();
    return { data: categories };
  }

  @Public()
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeProducts') includeProducts?: string,
  ) {
    const category = await this.categoriesService.findOne(id, includeProducts === 'true');
    return { data: category };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const category = await this.categoriesService.findBySlug(slug);
    return { data: category };
  }

  @Public()
  @Get('slug/:slug/filters')
  async getCategoryFilters(@Param('slug') slug: string) {
    const filters = await this.categoriesService.getCategoryFiltersBySlug(slug);
    return { data: filters };
  }

  @Public()
  @Get('slug/:slug/products')
  async getCategoryProductsBySlug(
    @Param('slug') slug: string,
    @Query() query: CategoryProductsQueryDto,
  ) {
    const result = await this.categoriesService.queryCategoryProductsBySlug(slug, query);
    return result;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return { message: 'Category updated successfully', data: category };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.remove(id);
  }

  @Post(':id/featured')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleFeatured(
    @Param('id', ParseIntPipe) id: number,
    @Body('isFeatured') isFeatured: boolean,
  ) {
    const category = await this.categoriesService.toggleFeatured(id, isFeatured);
    return { message: 'Category featured status updated', data: category };
  }

  @Post(':id/reorder')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reorderCategories(@Body('orders') orders: { id: number; order: number }[]) {
    await this.categoriesService.reorderCategories(orders);
    return { message: 'Categories reordered successfully' };
  }

  @Get(':id/ancestors')
  @Public()
  async getAncestors(@Param('id', ParseIntPipe) id: number) {
    const ancestors = await this.categoriesService.getAncestors(id);
    return { data: ancestors };
  }

  @Get(':id/descendants')
  @Public()
  async getDescendants(@Param('id', ParseIntPipe) id: number) {
    const descendants = await this.categoriesService.getDescendants(id);
    return { data: descendants };
  }

  @Get(':id/products')
  @Public()
  async getCategoryProducts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeSubcategories') includeSubcategories?: string,
  ) {
    const result = await this.categoriesService.getCategoryProducts(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      includeSubcategories: includeSubcategories === 'true',
    });
    return result;
  }
}