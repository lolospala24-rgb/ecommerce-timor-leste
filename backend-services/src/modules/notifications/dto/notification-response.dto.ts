// placeholder for src/modules/notifications/dto/notification-response.dto.ts
export class NotificationResponseDto {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data: any | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Optional user relation
  user?: {
    id: number;
    name: string;
    email: string;
  };
}