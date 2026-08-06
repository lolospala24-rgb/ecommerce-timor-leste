export class CourierResponseDto {
  id: number;
  name: string;
  code: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
