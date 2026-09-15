import { PageHeader } from '@/components/shared/PageHeader';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { OrderStatusChart } from '@/components/analytics/OrderStatusChart';
import { TopProductsCard } from '@/components/analytics/TopProductsCard';
import { ReviewsPanel } from '@/components/analytics/ReviewsPanel';

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Deeper insight into your store's sales and reputation." />

      <div className="mb-6">
        <SalesChart />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderStatusChart />
        <TopProductsCard />
        <div className="lg:col-span-2">
          <ReviewsPanel />
        </div>
      </div>
    </div>
  );
}
