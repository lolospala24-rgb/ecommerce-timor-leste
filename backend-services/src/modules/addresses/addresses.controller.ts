// placeholder for src/modules/addresses/addresses.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createAddressDto: CreateAddressDto,
    @CurrentUser('id') userId: number,
  ) {
    const address = await this.addressesService.create(createAddressDto, userId);
    return { message: 'Address created successfully', data: address };
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    const addresses = await this.addressesService.findAll(userId);
    return { data: addresses };
  }

  @Get('primary')
  async getPrimaryAddress(@CurrentUser('id') userId: number) {
    const address = await this.addressesService.getPrimaryAddress(userId);
    return { data: address };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const address = await this.addressesService.findOne(id, userId);
    return { data: address };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser('id') userId: number,
  ) {
    const address = await this.addressesService.update(id, updateAddressDto, userId);
    return { message: 'Address updated successfully', data: address };
  }

  @Patch(':id/primary')
  @HttpCode(HttpStatus.OK)
  async setPrimary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const address = await this.addressesService.setPrimary(id, userId);
    return { message: 'Primary address set successfully', data: address };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.addressesService.remove(id, userId);
  }

  // Timor-Leste specific endpoints
  @Public()
  @Get('timor/municipalities')
  getMunicipalities() {
    return { data: this.addressesService.getMunicipalities() };
  }

  @Public()
  @Get('timor/municipalities/:municipality/postos')
  getPostos(@Param('municipality') municipality: string) {
    return { data: this.addressesService.getPostosByMunicipality(municipality) };
  }

  @Public()
  @Get('timor/municipalities/:municipality/postos/:posto/sucos')
  getSucos(
    @Param('municipality') municipality: string,
    @Param('posto') posto: string,
  ) {
    return { data: this.addressesService.getSucosByPosto(municipality, posto) };
  }

  @Public()
  @Get('timor/validate')
  validateAddress(@Body() address: any) {
    return { data: this.addressesService.validateTimorAddress(address) };
  }

  @Roles(Role.ADMIN)
  @Post('timor/seed')
  @HttpCode(HttpStatus.CREATED)
  async seedAddressData() {
    await this.addressesService.seedAddressData();
    return { message: 'Address data seeded successfully' };
  }
}