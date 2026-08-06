// placeholder for src/modules/addresses/dto/address-response.dto.ts
export class AddressResponseDto {
  id: number;
  userId: number;
  label: string | null;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village: string | null;
  street: string | null;
  reference: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  fullAddress?: string;
  shippingLabel?: string;
}