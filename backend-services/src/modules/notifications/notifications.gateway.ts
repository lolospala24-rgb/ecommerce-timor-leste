import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

// Same allow-list construction as main.ts's HTTP CORS config — kept in sync
// manually since @WebSocketGateway's cors option is evaluated at decoration
// time (no DI available yet) and can't call into a shared provider.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:3002',
].filter((origin): origin is string => Boolean(origin));

// The single realtime gateway for everything user/order/notification
// related. Previously this was split across two separate gateways
// (NotificationsGateway + OrderEventsGateway) that both independently
// implemented "join a per-user room on connect" — consolidated here so
// there's one authenticated connection and one room scheme instead of two
// diverging ones.
//
// SECURITY: connections used to be trusted on a client-supplied `userId`
// (via `handshake.query.userId` or a `join-*-room` message payload), which
// let any socket join any other user's room and read their private order /
// payment notifications — a straightforward IDOR. `handleConnection` now
// verifies the same httpOnly `access_token` cookie the REST API trusts
// (mirrors JwtStrategy) and derives the room membership from that, never
// from anything the client says about itself. Unauthenticated sockets are
// disconnected immediately.
@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private parseCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      if (key === name) {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.parseCookie(client.handshake.headers.cookie, 'access_token');
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as {
        sub?: number;
        role?: string;
        jti?: string;
      };

      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }

      if (payload.jti) {
        const isBlacklisted = await this.redisService.get(`token_blacklist:${payload.jti}`);
        if (isBlacklisted) {
          client.disconnect(true);
          return;
        }
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      client.data.role = user.role;
      client.join(`user:${user.id}`);
      if (user.role === 'ADMIN') {
        client.join('admins');
      }
    } catch (error) {
      // Expired/invalid/tampered token — reject rather than connect
      // unauthenticated.
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // no-op
  }

  // Joining a specific order's room grants live status updates for that
  // order — authorized against the verified identity from handleConnection
  // (never the client-supplied payload), so a customer/seller can only
  // subscribe to their own orders and an admin can subscribe to any order.
  @SubscribeMessage('join-order-room')
  async handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId?: number },
  ) {
    const userId = client.data.userId as number | undefined;
    const role = client.data.role as string | undefined;
    if (!userId || !payload?.orderId) return;

    if (role === 'ADMIN') {
      client.join(`order:${payload.orderId}`);
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { customerId: true, seller: { select: { userId: true } } },
    });

    if (!order) return;
    const owns = order.customerId === userId || order.seller?.userId === userId;
    if (owns) {
      client.join(`order:${payload.orderId}`);
    }
  }

  emitNotification(userId: number | string, payload: any) {
    this.server.to(`user:${userId}`).emit('notifications:updated', payload);
  }

  // Room-scoped order-status push to whoever is watching this specific
  // order, plus the owning customer's personal room (covers the case where
  // they're on a page that never joined `order:<id>`, e.g. their orders
  // list). Never a global `server.emit` — that used to leak every order's
  // customer name/email/total to every connected socket regardless of who
  // they were.
  emitOrderUpdated(orderId: number, payload: any) {
    this.server.to(`order:${orderId}`).emit('order-updated', payload);
    // Admin-wide fan-out — the admin shipping/orders list views watch every
    // order, not one at a time, so they subscribe via the `admins` room
    // rather than joining every individual `order:<id>` room.
    this.server.to('admins').emit('order-updated', payload);
    if (payload?.userId) {
      this.server.to(`user:${payload.userId}`).emit('order-updated', payload);
    }
  }

  // "New order" is admin-relevant (goes to the `admins` room only — this
  // mirrors the persisted broadcastNotification recipients) and
  // customer-relevant (their own room only). No untargeted server.emit.
  emitOrderCreated(payload: any) {
    this.server.to('admins').emit('admin.new_order', payload);
    if (payload?.userId) {
      this.server.to(`user:${payload.userId}`).emit('customer.order_created', payload);
    }
  }
}
