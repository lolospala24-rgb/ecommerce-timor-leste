// placeholder for src/modules/search/search.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto, AdvancedSearchDto, AiSearchQueryDto } from './dto/search-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('search')
@Public()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() searchQuery: SearchQueryDto) {
    const result = await this.searchService.search(searchQuery);
    return result;
  }

  @Get('ai')
  async aiSearch(@Query() aiSearchQuery: AiSearchQueryDto) {
    const result = await this.searchService.aiSearch({
      query: aiSearchQuery.q,
      page: aiSearchQuery.page ?? 1,
      limit: aiSearchQuery.limit ?? 20,
    });
    return result;
  }

  @Get('products')
  async searchProducts(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const result = await this.searchService.searchProducts({
      query,
      page,
      limit,
      sortBy,
      sortOrder,
    });
    return result;
  }

  @Get('sellers')
  async searchSellers(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.searchSellers({
      query,
      page,
      limit,
    });
    return result;
  }

  @Get('categories')
  async searchCategories(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.searchCategories({
      query,
      page,
      limit,
    });
    return result;
  }

  @Get('orders')
  @Roles(Role.ADMIN, Role.SELLER)
  async searchOrders(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.searchOrders({
      userId,
      userRole,
      query,
      page,
      limit,
    });
    return result;
  }

  @Get('users')
  @Roles(Role.ADMIN)
  async searchUsers(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.searchUsers({
      query,
      page,
      limit,
    });
    return result;
  }

  @Post('advanced')
  async advancedSearch(@Body() advancedSearchDto: AdvancedSearchDto) {
    const result = await this.searchService.advancedSearch(advancedSearchDto);
    return result;
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.autocomplete(query, limit);
    return result;
  }

  @Get('trending')
  async getTrendingSearches(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.getTrendingSearches(limit);
    return { data: result };
  }

  @Get('recent')
  async getRecentSearches(
    @CurrentUser('id') userId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.getRecentSearches(userId, limit);
    return { data: result };
  }

  @Post('recent/save')
  async saveSearch(
    @CurrentUser('id') userId: number,
    @Body('query') query: string,
  ) {
    await this.searchService.saveSearch(userId, query);
    return { message: 'Search saved' };
  }

  @Delete('recent/clear')
  async clearRecentSearches(@CurrentUser('id') userId: number) {
    await this.searchService.clearRecentSearches(userId);
    return { message: 'Recent searches cleared' };
  }

  @Get('suggestions')
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    const result = await this.searchService.getSuggestions(query, limit);
    return { data: result };
  }

  @Get('filters')
  async getSearchFilters() {
    const result = await this.searchService.getSearchFilters();
    return { data: result };
  }
}