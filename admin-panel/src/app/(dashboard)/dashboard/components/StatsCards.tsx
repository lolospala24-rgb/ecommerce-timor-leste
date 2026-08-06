'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';

interface StatsCardsProps {
  stats?: {
    users?: { total: number; newToday: number; newThisWeek: number; newThisMonth: number; active: number };
    sellers?: { total: number; verified: number; pending: number; newThisMonth: number; verificationRate: number };
    products?: { total: number; active: number; outOfStock: number; lowStock: number; activeRate: number };
    orders?: { total: number; pending: number; processing: number; shipping: number; delivered: number; cancelled: number; revenue: number };
    payments?: { pending: number };
    reviews?: { total: number; pending: number; averageRating: number };
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Default stats if none provided
  const defaultStats = {
    users: { total: 0, newToday: 0, newThisWeek: 0, newThisMonth: 0, active: 0 },
    sellers: { total: 0, verified: 0, pending: 0, newThisMonth: 0, verificationRate: 0 },
    products: { total: 0, active: 0, outOfStock: 0, lowStock: 0, activeRate: 0 },
    orders: { total: 0, pending: 0, processing: 0, shipping: 0, delivered: 0, cancelled: 0, revenue: 0 },
    payments: { pending: 0 },
    reviews: { total: 0, pending: 0, averageRating: 0 },
  };

  const safeStats = stats || defaultStats;
  const safeUsers = safeStats.users || defaultStats.users;
  const safeSellers = safeStats.sellers || defaultStats.sellers;
  const safeProducts = safeStats.products || defaultStats.products;
  const safeOrders = safeStats.orders || defaultStats.orders;

  const cards = [
    {
      title: 'Total Revenue',
      icon: DollarSign,
      value: safeOrders.revenue || 0,
      format: 'currency',
      color: 'bg-green-500',
    },
    {
      title: 'Total Orders',
      icon: ShoppingCart,
      value: safeOrders.total || 0,
      format: 'number',
      color: 'bg-blue-500',
    },
    {
      title: 'Total Users',
      icon: Users,
      value: safeUsers.total || 0,
      format: 'number',
      color: 'bg-purple-500',
    },
    {
      title: 'Total Products',
      icon: Package,
      value: safeProducts.total || 0,
      format: 'number',
      color: 'bg-orange-500',
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-full ${card.color} bg-opacity-10 flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(card.value, card.format)}</div>
              <p className="text-xs text-muted-foreground">
                {card.title === 'Total Revenue' && `Last month: $${(safeOrders.revenue || 0).toLocaleString()}`}
                {card.title === 'Total Orders' && `${safeOrders.pending || 0} pending`}
                {card.title === 'Total Users' && `${safeUsers.newToday || 0} new today`}
                {card.title === 'Total Products' && `${safeProducts.active || 0} active`}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}