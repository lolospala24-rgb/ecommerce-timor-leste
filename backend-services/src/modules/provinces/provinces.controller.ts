import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ProvincesService } from './provinces.service';
import { CreateProvinceDto } from './dto/create-province.dto';

@Controller('provinces')
export class ProvincesController {
  constructor(private readonly service: ProvincesService) {}

  @Post()
  async create(@Body() dto: CreateProvinceDto) {
    const province = await this.service.create(dto);
    return { message: 'Province created', data: province };
  }

  @Get()
  async findAll() {
    const data = await this.service.findAll();
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.findOne(id);
    return { data };
  }
}
