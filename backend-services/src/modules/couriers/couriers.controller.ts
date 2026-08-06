import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CouriersService } from './couriers.service';
import { CreateCourierDto, UpdateCourierDto, CourierResponseDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller('couriers')
@Roles(Role.ADMIN)
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCourierDto: CreateCourierDto): Promise<CourierResponseDto> {
    return this.couriersService.create(createCourierDto);
  }

  @Get()
  async findAll(): Promise<CourierResponseDto[]> {
    return this.couriersService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CourierResponseDto> {
    return this.couriersService.findById(parseInt(id, 10));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCourierDto: UpdateCourierDto,
  ): Promise<CourierResponseDto> {
    return this.couriersService.update(parseInt(id, 10), updateCourierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.couriersService.remove(parseInt(id, 10));
  }
}
