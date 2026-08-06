import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class OrderEventsGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // no-op
  }

  @SubscribeMessage('join-order-room')
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId?: number; userId?: string | number },
  ) {
    if (payload?.orderId) {
      client.join(`order:${payload.orderId}`);
    }

    if (payload?.userId) {
      client.join(`user:${payload.userId}`);
    }
  }

  emitOrderUpdated(orderId: number, payload: any) {
    this.server.to(`order:${orderId}`).emit('order-updated', payload);
    this.server.to(`user:${payload.userId}`).emit('order-updated', payload);
  }

  emitOrderCreated(payload: any) {
    this.server.emit('order.created', payload);
    this.server.emit('admin.new_order', payload);
    if (payload?.userId) {
      this.server.to(`user:${payload.userId}`).emit('customer.order_created', payload);
    }
  }
}
