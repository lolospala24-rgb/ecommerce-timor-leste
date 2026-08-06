// placeholder for src/modules/orders/guards/order-owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OrderOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orderId = parseInt(request.params.id);

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!orderId) {
      throw new NotFoundException('Order ID not provided');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Admin can access any order
    if (user.role === 'ADMIN') {
      return true;
    }

    // Customer can access their own orders
    if (user.role === 'CUSTOMER' && order.customerId === user.id) {
      return true;
    }

    // Seller can access orders belonging to their store
    if (user.role === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.id },
      });

      if (seller && order.sellerId === seller.id) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have permission to access this order');
  }
}