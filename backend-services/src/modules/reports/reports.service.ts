import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(options: {
    startDate?: Date;
    endDate?: Date;
    period?: string;
  }) {
    let startDate = options.startDate;
    let endDate = options.endDate;

    // If no dates provided, use default period
    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();

      if (options.period === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (options.period === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }
    }

    // Get all orders in the date range
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: OrderStatus.DELIVERED,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by date for trend
    const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
      }
      dailyData[dateKey].revenue += order.total;
      dailyData[dateKey].orders += 1;
    });

    const trend = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      activeSellers: 0,
      dailySales: trend,
      weeklySales: [],
      monthlySales: [],
      paymentMethodDistribution: [],
      statusDistribution: [],
    };
  }

  async getSellersReport(options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const limit = options.limit || 10;
    let startDate = options.startDate;
    let endDate = options.endDate;

    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    }

    const sellerStats = await this.prisma.seller.findMany({
      take: limit,
      select: {
        id: true,
        storeName: true,
        _count: {
          select: {
            products: true,
            orders: {
              where: {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
      },
    });

    return sellerStats.map((seller) => ({
      id: seller.id,
      storeName: seller.storeName,
      ownerName: seller.storeName,
      revenue: 0,
      orders: seller._count.orders,
      averageOrderValue: 0,
      rating: 0,
      isVerified: true,
      growth: 0,
    }));
  }

  async getProductsReport(options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const limit = options.limit || 10;
    let startDate = options.startDate;
    let endDate = options.endDate;

    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    }

    const productStats = await this.prisma.product.findMany({
      take: limit,
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        _count: {
          select: {
            orderItems: {
              where: {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
            reviews: true,
          },
        },
      },
    });

    return {
      topProducts: productStats.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        revenue: product.price * product._count.orderItems,
        unitsSold: product._count.orderItems,
        rating: 0,
        stock: 0,
        storeName: 'N/A',
        thumbnail: null,
      })),
      bottomProducts: [],
    };
  }
}
