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