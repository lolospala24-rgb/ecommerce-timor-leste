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
export class NotificationsGateway {
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

  @SubscribeMessage('join-notifications-room')
  handleJoinNotificationsRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string | number },
  ) {
    if (payload?.userId) {
      client.join(`user:${payload.userId}`);
    }
  }

  emitNotification(userId: number | string, payload: any) {
    this.server.to(`user:${userId}`).emit('notifications:updated', payload);
  }
}
