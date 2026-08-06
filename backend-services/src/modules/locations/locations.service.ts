import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  async findMunicipalityByName(name: string) {
    return this.prisma.municipality.findFirst({
      where: { name, isActive: true },
      include: { province: true },
    });
  }
}
