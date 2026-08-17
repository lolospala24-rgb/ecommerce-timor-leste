import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { ShippingSettingsDto } from './dto/shipping-settings.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Get('shipping-zones')
  async getShippingZones() {
    const zones = await this.shippingService.getShippingZones();
    return { data: zones };
  }

  @Roles(Role.ADMIN)
  @Post('shipping-zones')
  async createShippingZone(@Body() body: CreateShippingZoneDto | { zones: CreateShippingZoneDto[] }) {
    if (Array.isArray((body as any).zones)) {
      const payload = (body as any).zones as CreateShippingZoneDto[];
      const zones = await this.shippingService.setShippingZones(payload);
      return { data: zones };
    }

    const zone = await this.shippingService.createShippingZone(body as CreateShippingZoneDto);
    return { data: zone };
  }

  @Roles(Role.ADMIN)
  @Patch('shipping-zones/:id/toggle')
  async toggleShippingZone(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.shippingService.toggleShippingZoneStatus(id) };
  }

  @Roles(Role.ADMIN)
  @Patch('shipping-zones/:id')
  async updateShippingZone(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingZoneDto) {
    return { data: await this.shippingService.updateShippingZone(id, dto) };
  }

  @Roles(Role.ADMIN)
  @Delete('shipping-zones/:id')
  async removeShippingZone(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.shippingService.removeShippingZone(id) };
  }

  @Public()
  @Get('shipping/options')
  async getShippingOptions(
    @Query('municipalityId') municipalityId?: string,
    @Query('provinceId') provinceId?: string,
  ) {
    const options = await this.shippingService.getAvailableShippingOptions({
      municipalityId: municipalityId ? Number(municipalityId) : undefined,
      provinceId: provinceId ? Number(provinceId) : undefined,
    });
    return { data: options };
  }

  @Roles(Role.ADMIN)
  @Get('shipping/dashboard')
  async getShippingDashboard() {
    return { data: await this.shippingService.getShippingDashboardStats() };
  }

  @Public()
  @Get('shipping-settings')
  async getShippingSettings() {
    const settings = await this.shippingService.getShippingSettings();
    const zones = await this.shippingService.getShippingZones();
    return {
      data: {
        ...settings,
        shippingZones: zones,
      },
    };
  }

  @Public()
  @Post('shipping/calculate')
  async calculateShipping(@Body() body: { municipalityId?: number; provinceId?: number; municipality?: string; province?: string; shippingMethod?: string; subtotal?: number; courierId?: number; courierServiceId?: number; shippingZoneId?: number }) {
    const result = await this.shippingService.calculateShippingCost({
      municipalityId: body.municipalityId,
      provinceId: body.provinceId,
      municipality: body.municipality,
      province: body.province,
      shippingMethod: body.shippingMethod,
      subtotal: body.subtotal,
      courierId: body.courierId,
      courierServiceId: body.courierServiceId,
      shippingZoneId: body.shippingZoneId,
    });
    return { data: result };
  }

  @Roles(Role.ADMIN)
  @Put('shipping-settings')
  async updateShippingSettings(@Body() dto: ShippingSettingsDto) {
    const settings = await this.shippingService.updateShippingSettings(dto);
    const zones = await this.shippingService.getShippingZones();
    return {
      data: {
        ...settings,
        shippingZones: zones,
      },
    };
  }
}
