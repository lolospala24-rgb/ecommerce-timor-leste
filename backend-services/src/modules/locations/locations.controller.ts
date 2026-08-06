import { Controller, Get, Param, Post } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Public()
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
}
