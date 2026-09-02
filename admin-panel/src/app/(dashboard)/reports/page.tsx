'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesReport } from './components/SalesReport';
import { SellerReport } from './components/SellerReport';
import { ProductReport } from './components/ProductReport';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ExportButtons } from './components/ExportButtons';
import { RefreshCw, TrendingUp, DollarSign, ShoppingBag, Users } from 'lucide-react';

interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  activeSellers: number;
  averageOrderValue: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState('sales');
  // Owned here (not written via document.getElementById from inside
  // SalesReport) so the cards stay correct if this page re-renders for any
  // other reason, and so switching away from the Sales tab doesn't leave
  // them silently frozen on stale DOM text with no connection to real state.
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  const exportDateRange = {
    startDate: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined,
    endDate: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined,
  };

  const quickDateRanges = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', days: 'month' },
    { label: 'Last Month', days: 'lastMonth' },
  ];

  const setQuickRange = (days: number | string) => {
    const today = new Date();
    if (days === 0) {
      setDateRange({ from: today, to: today });
    } else if (days === 1) {
      const yesterday = subDays(today, 1);
      setDateRange({ from: yesterday, to: yesterday });
    } else if (days === 7) {
      setDateRange({ from: subDays(today, 7), to: today });
    } else if (days === 30) {
      setDateRange({ from: subDays(today, 30), to: today });
    } else if (days === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ from: start, to: today });
    } else if (days === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setDateRange({ from: start, to: end });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Analyze sales, seller performance, and product insights
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            reportType={activeTab as 'sales' | 'sellers' | 'products'}
            dateRange={exportDateRange}
          />
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>
            Select date range for your reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickDateRanges.map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button
              variant="default"
              onClick={() => {
                // Trigger refresh of all reports
                window.dispatchEvent(new CustomEvent('refreshReports'));
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Apply Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(summary?.totalRevenue ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Gross revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.totalOrders ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Completed orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sellers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.activeSellers ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Verified sellers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(summary?.averageOrderValue ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="sellers">Seller Report</TabsTrigger>
          <TabsTrigger value="products">Product Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <SalesReport dateRange={dateRange} onSummaryChange={setSummary} />
        </TabsContent>

        <TabsContent value="sellers" className="space-y-4">
          <SellerReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <ProductReport dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}