'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Package,
  MapPin,
  MapPinCheck,
  Route,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useShippingDashboard } from '@/hooks/useShippingRates';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  tone?: 'default' | 'warning';
}

export default function ShippingDashboardPage() {
  const { data, isLoading, refetch } = useShippingDashboard();

  const stats = data ?? {
    totalCouriers: 0,
    activeCouriers: 0,
    totalMunicipalities: 0,
    activeMunicipalities: 0,
    totalShippingZones: 0,
    activeShippingZones: 0,
    coveredMunicipalities: 0,
    uncoveredMunicipalities: 0,
  };

  const hasUncovered = stats.uncoveredMunicipalities > 0;

  const cards: StatCard[] = [
    { title: 'Total Couriers', value: stats.totalCouriers, icon: Truck, description: 'Registered courier partners' },
    { title: 'Active Couriers', value: stats.activeCouriers, icon: Truck, description: 'Couriers currently enabled' },
    { title: 'Total Municipalities', value: stats.totalMunicipalities, icon: MapPin, description: 'All municipalities in Timor-Leste' },
    { title: 'Active Municipalities', value: stats.activeMunicipalities, icon: MapPin, description: 'Municipalities enabled for use' },
    { title: 'Total Shipping Rates', value: stats.totalShippingZones, icon: Route, description: 'All configured courier rates' },
    { title: 'Active Shipping Rates', value: stats.activeShippingZones, icon: Package, description: 'Rates currently available at checkout' },
    { title: 'Covered Municipalities', value: stats.coveredMunicipalities, icon: CheckCircle2, description: 'Municipalities with at least one active rate' },
    {
      title: 'Uncovered Municipalities',
      value: stats.uncoveredMunicipalities,
      icon: hasUncovered ? AlertTriangle : MapPinCheck,
      description: hasUncovered
        ? 'Municipalities with zero active shipping coverage — customers here cannot check out'
        : 'Every municipality has at least one active rate',
      tone: hasUncovered ? 'warning' : 'default',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of courier, municipality, and shipping rate coverage across Timor-Leste.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {hasUncovered && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {stats.uncoveredMunicipalities} municipalit{stats.uncoveredMunicipalities === 1 ? 'y has' : 'ies have'} no active shipping coverage
            </p>
            <p className="text-sm text-amber-800">
              Customers in these municipalities cannot receive a shipping quote. Add or activate a shipping rate for
              them on the Shipping Rates page.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const isWarning = card.tone === 'warning';
            return (
              <Card key={card.title} className={cn(isWarning && 'border-amber-300')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full bg-opacity-10',
                      isWarning ? 'bg-amber-500' : 'bg-primary'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isWarning ? 'text-amber-600' : 'text-primary')} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-bold', isWarning && 'text-amber-600')}>
                    {card.value.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
