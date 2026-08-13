import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourierDto, UpdateCourierDto, CourierResponseDto } from './dto';

@Injectable()
export class CouriersService {
  constructor(private prisma: PrismaService) {}

  async create(createCourierDto: CreateCourierDto): Promise<CourierResponseDto> {
    // Check if courier with same code already exists
    const existingCourier = await this.prisma.courier.findUnique({
      where: { code: createCourierDto.code },
    });

    if (existingCourier) {
      throw new BadRequestException(
        `Courier with code '${createCourierDto.code}' already exists`,
      );
    }

    const courier = await this.prisma.courier.create({
      data: {
        name: createCourierDto.name,
        code: createCourierDto.code,
        description: createCourierDto.description || null,
        phone: createCourierDto.phone || null,
        website: createCourierDto.website || null,
        trackingUrl: createCourierDto.trackingUrl || null,
        status: createCourierDto.status || 'ACTIVE',
      },
    });

    return this.mapToCourierResponse(courier);
  }

  async findAll(): Promise<CourierResponseDto[]> {
    const couriers = await this.prisma.courier.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return couriers.map((courier) => this.mapToCourierResponse(courier));
  }

  async findById(id: number): Promise<CourierResponseDto> {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    return this.mapToCourierResponse(courier);
  }

  async update(id: number, updateCourierDto: UpdateCourierDto): Promise<CourierResponseDto> {
    // Check if courier exists
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    // Check if new code conflicts with existing courier
    if (updateCourierDto.code && updateCourierDto.code !== courier.code) {
      const existingCourier = await this.prisma.courier.findUnique({
        where: { code: updateCourierDto.code },
      });

      if (existingCourier) {
        throw new BadRequestException(
          `Courier with code '${updateCourierDto.code}' already exists`,
        );
      }
    }

    const updatedCourier = await this.prisma.courier.update({
      where: { id },
      data: {
        name: updateCourierDto.name || courier.name,
        code: updateCourierDto.code || courier.code,
        description: updateCourierDto.description !== undefined ? updateCourierDto.description : courier.description,
        phone: updateCourierDto.phone !== undefined ? updateCourierDto.phone : courier.phone,
        website: updateCourierDto.website !== undefined ? updateCourierDto.website : courier.website,
        trackingUrl: updateCourierDto.trackingUrl !== undefined ? updateCourierDto.trackingUrl : courier.trackingUrl,
        status: updateCourierDto.status || courier.status,
      },
    });

    return this.mapToCourierResponse(updatedCourier);
  }

  async remove(id: number): Promise<void> {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    const zoneCount = await this.prisma.shippingZone.count({ where: { courierId: id } });
    if (zoneCount > 0) {
      throw new BadRequestException(
        `Cannot delete "${courier.name}" — it is used by ${zoneCount} shipping rate(s). Deactivate it instead, or remove those rates first.`,
      );
    }

    await this.prisma.courier.delete({
      where: { id },
    });
  }

  private mapToCourierResponse(courier: any): CourierResponseDto {
    return {
      id: courier.id,
      name: courier.name,
      code: courier.code,
      description: courier.description || undefined,
      phone: courier.phone || undefined,
      website: courier.website || undefined,
      trackingUrl: courier.trackingUrl || undefined,
      status: courier.status,
      createdAt: courier.createdAt,
      updatedAt: courier.updatedAt,
    };
  }
}
