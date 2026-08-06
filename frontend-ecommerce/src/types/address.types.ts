export interface Address {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  label?: string;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village?: string;
  street?: string;
  reference?: string;
  phone?: string;
  isPrimary?: boolean;
}