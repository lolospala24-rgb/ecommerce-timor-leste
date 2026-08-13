// placeholder for src/modules/addresses/entities/address.entity.ts
import { Address } from '@prisma/client';

export class AddressEntity implements Address {
  id: number;
  userId: number;
  label: string | null;
  countryId: number | null;
  provinceId: number;
  municipalityId: number;
  province: string | null;
  municipality: string | null;
  postoAdmin: string | null;
  suco: string;
  village: string | null;
  street: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  reference: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<AddressEntity>) {
    Object.assign(this, partial);
  }

  // Get full formatted address
  getFullAddress(): string {
    const parts = [];
    if (this.street) parts.push(this.street);
    if (this.village) parts.push(this.village);
    parts.push(this.suco);
    parts.push(this.postoAdmin || '');
    parts.push(this.municipality || '');
    if (this.reference) parts.push(`(${this.reference})`);
    return parts.filter(Boolean).join(', ');
  }

  // Get address for shipping label
  getShippingLabel(): string {
    return `
      ${this.street || ''}
      ${this.village ? `Village: ${this.village}` : ''}
      Suco: ${this.suco}
      Posto: ${this.postoAdmin || ''}
      Municipality: ${this.municipality || ''}
      Phone: ${this.phone}
      ${this.reference ? `Reference: ${this.reference}` : ''}
    `.replace(/\n\s+/g, '\n').trim();
  }

  // Get short address (without reference)
  getShortAddress(): string {
    return `${this.suco}, ${this.postoAdmin || ''}, ${this.municipality || ''}`.replace(/, ,/g, ',').replace(/(^, |, $)/g, '');
  }

  // Get label or default
  getDisplayLabel(): string {
    return this.label || 'Address';
  }

  // Check if address is complete (has all required fields)
  isComplete(): boolean {
    return !!(
      this.municipality &&
      this.postoAdmin &&
      this.suco &&
      this.phone
    );
  }

  // Check if this is the primary address
  isPrimaryAddress(): boolean {
    return this.isPrimary;
  }

  // Get Google Maps search query
  getMapsQuery(): string {
    const parts = [];
    if (this.street) parts.push(this.street);
    if (this.village) parts.push(this.village);
    parts.push(this.suco);
    parts.push(this.postoAdmin || '');
    parts.push(this.municipality || '');
    parts.push('Timor-Leste');
    return parts.filter(Boolean).join(', ');
  }

  // Format phone number for display
  getFormattedPhone(): string | null {
    if (!this.phone) return null;
    return this.phone;
  }

  // Get address type based on label
  getAddressType(): 'home' | 'office' | 'other' {
    const label = this.label?.toLowerCase() || '';
    if (label.includes('home') || label.includes('uma')) return 'home';
    if (label.includes('office') || label.includes('loja')) return 'office';
    return 'other';
  }
}