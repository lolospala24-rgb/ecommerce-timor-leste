// placeholder for src/modules/addresses/addresses.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  MUNICIPALITIES_DATA,
  POSTOS_DATA,
  SUCOS_DATA,
} from './timor-leste/municipalities.data';

type MunicipalityWithProvince = Prisma.MunicipalityGetPayload<{ include: { province: true } }>;

@Injectable()
export class AddressesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createAddressDto: CreateAddressDto, userId: number) {
    // Validate Timor-Leste address (skip name-based validation when municipalityId provided)
    if (!createAddressDto.municipalityId) {
      const validation = this.validateTimorAddress(createAddressDto);
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join(', '));
      }
    }

    // Check if this is the first address for the user
    const addressCount = await this.prisma.address.count({
      where: { userId },
    });

    const isPrimary = addressCount === 0 ? true : (createAddressDto.isPrimary || false);

    // If setting as primary, unset other primary addresses
    if (isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Prefer explicit municipalityId/provinceId if provided
    let municipalityRef = null;
    let provinceRef = null;

    if (createAddressDto.municipalityId) {
      municipalityRef = await this.prisma.municipality.findFirst({ where: { id: createAddressDto.municipalityId, isActive: true }, include: { province: true } });
      provinceRef = municipalityRef?.province ?? null;
    } else {
      municipalityRef = await this.resolveMunicipality(createAddressDto.municipality, createAddressDto.province);
      provinceRef = municipalityRef?.province ?? null;
    }

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: createAddressDto.label,
        provinceId: createAddressDto.provinceId ?? provinceRef?.id ?? 0,
        municipalityId: municipalityRef?.id ?? createAddressDto.municipalityId ?? 0,
        province: provinceRef?.name ?? createAddressDto.province ?? null,
        municipality: municipalityRef?.name ?? createAddressDto.municipality ?? null,
        postoAdmin: createAddressDto.postoAdmin,
        suco: createAddressDto.suco,
        village: createAddressDto.village,
        street: createAddressDto.street,
        reference: createAddressDto.reference,
        recipientName: createAddressDto.recipientName,
        phone: createAddressDto.phone,
        latitude: createAddressDto.latitude,
        longitude: createAddressDto.longitude,
        isPrimary,
        isActive: true,
      } as any,
    });

    // Clear cache
    await this.clearAddressCache(userId);

    return address;
  }

  async findAll(userId: number) {
    const cacheKey = `addresses:user:${userId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const addresses = await this.prisma.address.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    await this.redisService.set(cacheKey, JSON.stringify(addresses), 300);

    return addresses;
  }

  async getPrimaryAddress(userId: number) {
    const address = await this.prisma.address.findFirst({
      where: { userId, isPrimary: true, isActive: true },
    });

    return address;
  }

  async findOne(id: number, userId: number) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  async update(id: number, updateAddressDto: UpdateAddressDto, userId: number) {
    const address = await this.findOne(id, userId);
    const addressRecord = address as Record<string, any>;

    // Validate Timor-Leste address if any location fields are updated
    if (!updateAddressDto.municipalityId && (updateAddressDto.municipality || updateAddressDto.postoAdmin || updateAddressDto.suco)) {
      const validation = this.validateTimorAddress({
        municipality: updateAddressDto.municipality || address.municipality || undefined,
        postoAdmin: updateAddressDto.postoAdmin || addressRecord.postoAdmin || undefined,
        suco: updateAddressDto.suco || address.suco,
      });
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join(', '));
      }
    }

    // If setting as primary, unset other primary addresses
    if (updateAddressDto.isPrimary && !address.isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Prefer municipalityId/provinceId when present
    let municipalityRef: MunicipalityWithProvince | null = null;
    let provinceRef: MunicipalityWithProvince['province'] | null = null;

    if (updateAddressDto.municipalityId) {
      municipalityRef = await this.prisma.municipality.findFirst({ where: { id: updateAddressDto.municipalityId, isActive: true }, include: { province: true } });
      provinceRef = municipalityRef?.province ?? null;
    } else if (updateAddressDto.municipality) {
      municipalityRef = await this.resolveMunicipality(updateAddressDto.municipality, updateAddressDto.province);
      provinceRef = municipalityRef?.province ?? null;
    }

    const updatedAddress = await this.prisma.address.update({
      where: { id },
      data: {
        label: updateAddressDto.label,
        provinceId: updateAddressDto.provinceId ?? (municipalityRef ? (provinceRef?.id ?? 0) : address.provinceId),
        municipalityId: municipalityRef ? (municipalityRef.id ?? 0) : (updateAddressDto.municipalityId ?? address.municipalityId),
        province: municipalityRef ? (provinceRef?.name ?? updateAddressDto.province ?? null) : (updateAddressDto.province ?? address.province),
        municipality: municipalityRef ? (municipalityRef.name ?? updateAddressDto.municipality ?? null) : (updateAddressDto.municipality ?? address.municipality),
        postoAdmin: updateAddressDto.postoAdmin || addressRecord.postoAdmin || null,
        suco: updateAddressDto.suco || address.suco,
        village: updateAddressDto.village,
        street: updateAddressDto.street,
        reference: updateAddressDto.reference,
        recipientName: updateAddressDto.recipientName,
        phone: updateAddressDto.phone,
        latitude: updateAddressDto.latitude,
        longitude: updateAddressDto.longitude,
        isPrimary: updateAddressDto.isPrimary,
      } as any,
    });

    // Clear cache
    await this.clearAddressCache(userId);

    return updatedAddress;
  }

  async setPrimary(id: number, userId: number) {
    await this.findOne(id, userId);

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      }),
      this.prisma.address.update({
        where: { id },
        data: { isPrimary: true },
      }),
    ]);

    // Clear cache
    await this.clearAddressCache(userId);

    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    const address = await this.findOne(id, userId);

    if (address.isPrimary) {
      throw new BadRequestException('Cannot delete primary address. Set another address as primary first.');
    }

    // Soft delete
    await this.prisma.address.update({
      where: { id },
      data: { isActive: false },
    });

    // Clear cache
    await this.clearAddressCache(userId);

    return true;
  }

  // Timor-Leste Address Validation
  validateTimorAddress(address: {
    municipality: string;
    postoAdmin: string;
    suco: string;
    village?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate municipality
    const municipalityData = MUNICIPALITIES_DATA.find(
      m => m.name === address.municipality || m.nameTetum === address.municipality
    );
    if (!municipalityData) {
      errors.push(`Municipality "${address.municipality}" is not valid. Valid municipalities: ${MUNICIPALITIES_DATA.map(m => m.name).join(', ')}`);
    }

    // Validate posto administrativo
    if (municipalityData) {
      const postoData = POSTOS_DATA[address.municipality];
      if (!postoData || !postoData.includes(address.postoAdmin)) {
        errors.push(`Posto Administrativo "${address.postoAdmin}" is not valid for municipality "${address.municipality}". Valid options: ${postoData?.join(', ') || 'None'}`);
      }
    }

    // Validate suco
    if (municipalityData && address.postoAdmin) {
      const sucoData = SUCOS_DATA[address.municipality]?.[address.postoAdmin];
      if (!sucoData || !sucoData.includes(address.suco)) {
        errors.push(`Suco "${address.suco}" is not valid for Posto "${address.postoAdmin}" in municipality "${address.municipality}"`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get all municipalities
  getMunicipalities() {
    return MUNICIPALITIES_DATA.map(m => ({
      id: m.id,
      name: m.name,
      nameTetum: m.nameTetum,
      capital: m.capital,
      area: m.area,
      population: m.population,
    }));
  }

  // Get postos by municipality
  getPostosByMunicipality(municipality: string) {
    const municipalityData = MUNICIPALITIES_DATA.find(
      m => m.name === municipality || m.nameTetum === municipality
    );
    
    if (!municipalityData) {
      throw new NotFoundException(`Municipality "${municipality}" not found`);
    }

    const postos = POSTOS_DATA[municipalityData.name] || [];
    return postos.map(posto => ({
      name: posto,
    }));
  }

  // Get sucos by municipality and posto
  getSucosByPosto(municipality: string, posto: string) {
    const municipalityData = MUNICIPALITIES_DATA.find(
      m => m.name === municipality || m.nameTetum === municipality
    );
    
    if (!municipalityData) {
      throw new NotFoundException(`Municipality "${municipality}" not found`);
    }

    const sucos = SUCOS_DATA[municipalityData.name]?.[posto] || [];
    return sucos.map(suco => ({
      name: suco,
    }));
  }

  // Get complete address string
  getFullAddress(address: any): string {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.village) parts.push(address.village);
    parts.push(address.suco);
    parts.push(address.postoAdmin);
    parts.push(address.municipality);
    if (address.reference) parts.push(`(${address.reference})`);
    return parts.join(', ');
  }

  // Format address for shipping label
  formatShippingLabel(address: any): string {
    return `
      ${address.street || ''}
      ${address.village ? `Village: ${address.village}` : ''}
      Suco: ${address.suco}
      Posto: ${address.postoAdmin}
      Municipality: ${address.municipality}
      Phone: ${address.phone}
      ${address.reference ? `Reference: ${address.reference}` : ''}
    `.replace(/\n\s+/g, '\n').trim();
  }

  // Seed address data (for admin use)
  async seedAddressData() {
    // This would populate a database table with all Timor-Leste address data
    // For now, we'll just cache the data in Redis
    await this.redisService.set('timor:municipalities', JSON.stringify(MUNICIPALITIES_DATA), 86400);
    await this.redisService.set('timor:postos', JSON.stringify(POSTOS_DATA), 86400);
    await this.redisService.set('timor:sucos', JSON.stringify(SUCOS_DATA), 86400);
    
    return true;
  }

  private async clearAddressCache(userId: number) {
    await this.redisService.del(`addresses:user:${userId}`);
  }

  private async resolveMunicipality(
    municipalityName: string,
    provinceName?: string,
  ): Promise<MunicipalityWithProvince | null> {
    const normalizedMunicipality = municipalityName?.trim();
    if (!normalizedMunicipality) {
      return null;
    }

    const municipality = await this.prisma.municipality.findFirst({
      where: {
        name: normalizedMunicipality,
        isActive: true,
      },
      include: { province: true },
    });

    if (municipality) {
      return municipality;
    }

    const province = provinceName
      ? await this.prisma.province.findFirst({
          where: {
            name: provinceName,
            isActive: true,
          },
        })
      : null;

    if (!province) {
      return null;
    }

    const createdMunicipality = await this.prisma.municipality.create({
      data: {
        provinceId: province.id,
        name: normalizedMunicipality,
        code: normalizedMunicipality.toUpperCase().slice(0, 3),
      },
    });

    return {
      ...createdMunicipality,
      province,
    } as MunicipalityWithProvince;
  }
}