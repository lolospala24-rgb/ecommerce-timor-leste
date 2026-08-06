// placeholder for src/modules/admin/entities/admin-log.entity.ts
import { AdminLog } from '@prisma/client';

export class AdminLogEntity implements AdminLog {
  id: number;
  adminId: number;
  action: string;
  targetType: string;
  targetId: number;
  details: any;
  ipAddress: string | null;
  createdAt: Date;

  constructor(partial: Partial<AdminLogEntity>) {
    Object.assign(this, partial);
  }

  // Get formatted action for display
  getFormattedAction(): string {
    return this.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  // Get action color for UI
  getActionColor(): string {
    const colors: Record<string, string> = {
      APPROVE_SELLER: 'green',
      REJECT_SELLER: 'red',
      BLOCK_USER: 'orange',
      UNBLOCK_USER: 'green',
      CHANGE_ROLE: 'blue',
      DELETE_USER: 'red',
      DELETE_PRODUCT: 'red',
      UPDATE_SETTINGS: 'purple',
    };
    return colors[this.action] || 'gray';
  }

  // Get icon name for UI
  getActionIcon(): string {
    const icons: Record<string, string> = {
      APPROVE_SELLER: 'check-circle',
      REJECT_SELLER: 'x-circle',
      BLOCK_USER: 'shield-off',
      UNBLOCK_USER: 'shield',
      CHANGE_ROLE: 'user-cog',
      DELETE_USER: 'user-x',
      DELETE_PRODUCT: 'package-x',
      UPDATE_SETTINGS: 'settings',
    };
    return icons[this.action] || 'activity';
  }

  // Check if log is for seller related action
  isSellerAction(): boolean {
    return this.targetType === 'SELLER';
  }

  // Check if log is for user related action
  isUserAction(): boolean {
    return this.targetType === 'USER';
  }

  // Check if log is for product related action
  isProductAction(): boolean {
    return this.targetType === 'PRODUCT';
  }
}