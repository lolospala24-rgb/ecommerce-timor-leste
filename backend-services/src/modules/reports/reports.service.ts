import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { rowsToCsv, rowsToExcelBuffer, ExportColumn } from '../../common/utils/export.util';
import { Buffer } from 'buffer';

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

  private static readonly EXPORT_COLUMNS: Record<'sales' | 'sellers' | 'products', ExportColumn[]> = {
    sales: [
      { key: 'date', header: 'Date' },
      { key: 'revenue', header: 'Revenue' },
      { key: 'orders', header: 'Orders' },
    ],
    sellers: [
      { key: 'storeName', header: 'Store Name' },
      { key: 'orders', header: 'Orders' },
      { key: 'revenue', header: 'Revenue' },
      { key: 'isVerified', header: 'Verified' },
    ],
    products: [
      { key: 'name', header: 'Product Name' },
      { key: 'price', header: 'Price' },
      { key: 'unitsSold', header: 'Units Sold' },
      { key: 'revenue', header: 'Revenue' },
    ],
  };

  // Reuses the same query methods behind the JSON report endpoints — the
  // export is always exactly what the on-screen report shows, never a
  // second, independently-computed dataset that could drift from it.
  async exportReport(
    type: 'sales' | 'sellers' | 'products',
    dateRange: { startDate?: Date; endDate?: Date },
    format: 'csv' | 'excel',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    let rows: Record<string, unknown>[];

    if (type === 'sales') {
      const report = await this.getSalesReport(dateRange);
      rows = report.dailySales;
    } else if (type === 'sellers') {
      rows = await this.getSellersReport({ ...dateRange, limit: 1000 });
    } else {
      const report = await this.getProductsReport({ ...dateRange, limit: 1000 });
      rows = report.topProducts;
    }

    const columns = ReportsService.EXPORT_COLUMNS[type];
    const dateStamp = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const buffer = await rowsToExcelBuffer(rows, columns, `${type} report`);
      return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${type}_report_${dateStamp}.xlsx`,
      };
    }

    const csv = rowsToCsv(rows, columns);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      filename: `${type}_report_${dateStamp}.csv`,
    };
  }
}
