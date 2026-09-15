import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapPaginated } from '@/lib/utils';
import type { SellerOrder } from '@/types/order.types';

export interface SellerCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  deliveryAddress: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 20; // caps at 2,000 orders scanned client-side — generous for a single store's history

// There is no backend "customers of this seller" endpoint (confirmed absent
// from the API). The only source of truth is the seller's own order list,
// which already embeds `customer` + delivery fields per order — so the
// customer directory is derived here by paging through every order once
// and aggregating client-side. This never touches any other seller's data
// or the platform-wide user table.
async function fetchAllSellerOrders(): Promise<SellerOrder[]> {
  const all: SellerOrder[] = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    const res = await api.get('/orders/seller/orders', { params: { page, limit: PAGE_LIMIT } });
    const body = unwrapPaginated<SellerOrder>(res);
    all.push(...body.data);
    if (!body.pagination?.hasNext) break;
    page += 1;
  }
  return all;
}

function deriveCustomers(orders: SellerOrder[]): SellerCustomer[] {
  const byCustomer = new Map<number, SellerCustomer>();

  for (const order of orders) {
    const c = order.customer;
    if (!c) continue;
    const existing = byCustomer.get(c.id);
    const address = [order.deliveryStreet, order.deliverySuco, order.deliveryMunicipality]
      .filter(Boolean)
      .join(', ') || null;

    if (!existing) {
      byCustomer.set(c.id, {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        deliveryAddress: address,
        totalOrders: 1,
        totalSpent: order.total,
        lastOrderDate: order.createdAt,
      });
    } else {
      existing.totalOrders += 1;
      existing.totalSpent += order.total;
      if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.createdAt;
        existing.deliveryAddress = address ?? existing.deliveryAddress;
      }
    }
  }

  return Array.from(byCustomer.values()).sort(
    (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime(),
  );
}

export function useSellerCustomers() {
  return useQuery({
    queryKey: ['seller-customers'],
    queryFn: async () => {
      const orders = await fetchAllSellerOrders();
      return deriveCustomers(orders);
    },
    staleTime: 60_000,
  });
}
