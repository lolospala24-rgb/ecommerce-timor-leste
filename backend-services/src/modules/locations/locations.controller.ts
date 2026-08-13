import { Controller, Get, Param, ParseIntPipe, Post, Patch, Delete, Body, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Roles(Role.ADMIN)
  @Post('seed/timor-leste')
  async seedTimorLesteLocations() {
    return { data: await this.locationsService.seedTimorLesteLocations() };
  }

  @Public()
  @Get('countries')
  async getCountries() {
    return { data: await this.locationsService.findAllCountries() };
  }

  @Public()
  @Get('countries/:countryCode/provinces')
  async getProvinces(@Param('countryCode') countryCode: string) {
    return { data: await this.locationsService.findProvincesByCountry(countryCode) };
  }

  @Public()
  @Get('provinces/:provinceName/municipalities')
  async getMunicipalities(@Param('provinceName') provinceName: string) {
    return { data: await this.locationsService.findMunicipalitiesByProvince(provinceName) };
  }

  @Public()
  @Get('municipalities')
  async getAllMunicipalities() {
    return { data: await this.locationsService.findAllMunicipalities() };
  }

  @Roles(Role.ADMIN)
  @Get('municipalities/admin')
  async getAllMunicipalitiesForAdmin(@Query('search') search?: string) {
    return { data: await this.locationsService.findAllMunicipalitiesForAdmin(search) };
  }

  @Roles(Role.ADMIN)
  @Post('municipalities')
  async createMunicipality(@Body() dto: CreateMunicipalityDto) {
    return { data: await this.locationsService.createMunicipality(dto) };
  }

  @Roles(Role.ADMIN)
  @Patch('municipalities/:id')
  async updateMunicipality(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMunicipalityDto) {
    return { data: await this.locationsService.updateMunicipality(id, dto) };
  }

  @Roles(Role.ADMIN)
  @Delete('municipalities/:id')
  async removeMunicipality(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.locationsService.removeMunicipality(id) };
  }
}
