export interface Address {
  id: number;
  userId: number;
  label: string | null;
  countryId: number | null;
  provinceId: number;
  municipalityId: number;
  province: string | null;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village: string | null;
  street: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  reference: string | null;
  phone: string | null;
  recipientName: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  label?: string;
  municipality: string;
  municipalityId?: number;
  provinceId?: number;
  postoAdmin: string;
  suco: string;
  village?: string;
  street?: string;
  reference?: string;
  recipientName?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}
