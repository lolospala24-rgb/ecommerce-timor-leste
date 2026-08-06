import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';

@Injectable()
export class ProvincesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProvinceDto) {
    const data: any = { name: dto.name };
    if (dto.code) data.code = dto.code;
    if (typeof dto.countryId === 'number') data.country = { connect: { id: dto.countryId } };

    const province = await this.prisma.province.create({ data });
    return province;
  }

  async findAll() {
    return this.prisma.province.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const p = await this.prisma.province.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Province not found');
    return p;
  }
}
