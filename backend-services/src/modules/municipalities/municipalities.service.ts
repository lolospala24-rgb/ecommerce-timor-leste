import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';

@Injectable()
export class MunicipalitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMunicipalityDto) {
    const m = await this.prisma.municipality.create({ data: dto });
    return m;
  }

  async findAll(provinceId?: number) {
    const where = provinceId ? { provinceId, isActive: true } : { isActive: true };
    return this.prisma.municipality.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findByProvince(provinceId: number) {
    return this.findAll(provinceId);
  }

  async findOne(id: number) {
    const m = await this.prisma.municipality.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Municipality not found');
    return m;
  }
}
