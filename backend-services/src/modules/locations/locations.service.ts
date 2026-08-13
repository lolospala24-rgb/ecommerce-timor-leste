import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedTimorLesteLocations() {
    const country = await this.prisma.country.upsert({
      where: { code: 'TL' },
      update: {},
      create: {
        name: 'Timor-Leste',
        code: 'TL',
      },
    });

    const provinces = [
      { name: 'Aileu', code: 'AL' },
      { name: 'Ainaro', code: 'AN' },
      { name: 'Baucau', code: 'BA' },
      { name: 'Bobonaro', code: 'BO' },
      { name: 'Covalima', code: 'CO' },
      { name: 'Dili', code: 'DI' },
      { name: 'Ermera', code: 'ER' },
      { name: 'Lautém', code: 'LA' },
      { name: 'Liquiçá', code: 'LI' },
      { name: 'Manatuto', code: 'MT' },
      { name: 'Manufahi', code: 'MF' },
      { name: 'Viqueque', code: 'VI' },
      { name: 'Oecusse', code: 'OE' },
    ];

    for (const province of provinces) {
      const createdProvince = await this.prisma.province.upsert({
        where: { countryId_name: { countryId: country.id, name: province.name } },
        update: {},
        create: {
          countryId: country.id,
          name: province.name,
          code: province.code,
        },
      });

      await this.prisma.municipality.upsert({
        where: { provinceId_name: { provinceId: createdProvince.id, name: province.name } },
        update: {},
        create: {
          provinceId: createdProvince.id,
          name: province.name,
          code: province.code,
        },
      });
    }

    return { country, provinces };
  }

  async findAllCountries() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findProvincesByCountry(countryCode: string) {
    return this.prisma.province.findMany({
      where: {
        country: { code: countryCode },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findMunicipalitiesByProvince(provinceName: string) {
    return this.prisma.municipality.findMany({
      where: {
        province: { name: provinceName },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllMunicipalities() {
    return this.prisma.municipality.findMany({
      where: { isActive: true },
      include: { province: true },
      orderBy: { name: 'asc' },
    });
  }

  async findMunicipalityByName(name: string) {
    return this.prisma.municipality.findFirst({
      where: { name, isActive: true },
      include: { province: true },
    });
  }

  // Admin management: includes inactive rows and optional search, unlike
  // the public findAllMunicipalities() which only surfaces active ones for
  // customer-facing selectors.
  async findAllMunicipalitiesForAdmin(search?: string) {
    return this.prisma.municipality.findMany({
      where: search
        ? { name: { contains: search } }
        : undefined,
      include: { province: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMunicipality(dto: CreateMunicipalityDto) {
    const province = await this.prisma.province.findUnique({ where: { id: dto.provinceId } });
    if (!province) {
      throw new BadRequestException(`Province with ID ${dto.provinceId} not found`);
    }

    const existing = await this.prisma.municipality.findFirst({
      where: { provinceId: dto.provinceId, name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Municipality "${dto.name}" already exists in this province`);
    }

    return this.prisma.municipality.create({
      data: {
        name: dto.name.trim(),
        provinceId: dto.provinceId,
        code: dto.code?.trim() || null,
      },
      include: { province: true },
    });
  }

  async updateMunicipality(id: number, dto: UpdateMunicipalityDto) {
    const municipality = await this.prisma.municipality.findUnique({ where: { id } });
    if (!municipality) {
      throw new NotFoundException(`Municipality with ID ${id} not found`);
    }

    const nextProvinceId = dto.provinceId ?? municipality.provinceId;
    const nextName = dto.name?.trim() ?? municipality.name;

    if (dto.name || dto.provinceId) {
      const existing = await this.prisma.municipality.findFirst({
        where: { provinceId: nextProvinceId, name: nextName, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Municipality "${nextName}" already exists in this province`);
      }
    }

    return this.prisma.municipality.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        provinceId: dto.provinceId,
        code: dto.code !== undefined ? dto.code?.trim() || null : undefined,
        isActive: dto.isActive,
      },
      include: { province: true },
    });
  }

  async removeMunicipality(id: number) {
    const municipality = await this.prisma.municipality.findUnique({ where: { id } });
    if (!municipality) {
      throw new NotFoundException(`Municipality with ID ${id} not found`);
    }

    const [addressCount, shippingZoneCount, courierRateCount] = await Promise.all([
      this.prisma.address.count({ where: { municipalityId: id } }),
      this.prisma.shippingZone.count({ where: { municipalityId: id } }),
      this.prisma.courierRate.count({ where: { municipalityId: id } }),
    ]);

    if (addressCount > 0 || shippingZoneCount > 0 || courierRateCount > 0) {
      throw new BadRequestException(
        `Cannot delete "${municipality.name}" — it is still referenced by ${addressCount} address(es), ${shippingZoneCount} shipping rate(s), and ${courierRateCount} courier rate(s). Deactivate it instead.`,
      );
    }

    await this.prisma.municipality.delete({ where: { id } });
    return { success: true };
  }
}
