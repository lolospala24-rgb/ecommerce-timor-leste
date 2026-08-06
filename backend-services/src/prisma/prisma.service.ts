import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Helper method to handle soft deletes
  async softDelete(model: string, id: number) {
    const modelMap: Record<string, string> = {
      user: 'isActive',
      product: 'isActive',
      address: 'isActive',
      category: 'isActive',
    };

    const field = modelMap[model];
    if (!field) {
      throw new Error(`Soft delete not configured for model: ${model}`);
    }

    return this.$executeRawUnsafe(
      `UPDATE ${model} SET ${field} = false WHERE id = ${id}`,
    );
  }

  // Helper method to check if record exists
  async exists(model: string, where: any): Promise<boolean> {
    const count = await this.$queryRawUnsafe<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${model} WHERE ${Object.entries(where)
        .map(([key, value]) =>
          `${key} = ${typeof value === 'string' ? `'${String(value).replace(/'/g, "''")}'` : value}`,
        )
        .join(' AND ')}`,
    );
    return Number(count[0].count) > 0;
  }

  // Helper method for pagination
  async paginate<T>(
    model: any,
    args: {
      where?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
      include?: any;
    },
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const { skip = 0, take = 10, where = {}, orderBy = {}, include = {} } = args;
    
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        skip,
        take,
        include,
      }),
      model.count({ where }),
    ]);

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages,
    };
  }

  // Helper method to handle transactions with retry
  async withTransaction<T>(
    fn: (prisma: PrismaService) => Promise<T>,
    retries = 3,
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.$transaction(async (tx) => {
          return await fn(tx as PrismaService);
        });
      } catch (error) {
        if (i === retries - 1) throw error;
        this.logger.warn(`Transaction failed, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Transaction failed after retries');
  }
}