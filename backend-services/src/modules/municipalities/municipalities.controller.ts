import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MunicipalitiesService } from './municipalities.service';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';

@Controller('municipalities')
export class MunicipalitiesController {
  constructor(private readonly service: MunicipalitiesService) {}

  @Post()
  async create(@Body() dto: CreateMunicipalityDto) {
    const data = await this.service.create(dto);
    return { message: 'Municipality created', data };
  }

  @Get()
  async findAll(@Query('provinceId') provinceId?: string) {
    const pid = provinceId ? parseInt(provinceId, 10) : undefined;
    const data = await this.service.findAll(pid);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.findOne(id);
    return { data };
  }
}
