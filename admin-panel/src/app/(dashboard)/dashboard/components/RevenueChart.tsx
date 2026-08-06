'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface RevenueChartProps {
  data?: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  period: 'day' | 'week' | 'month' | 'year';
  isLoading?: boolean;
}

export function RevenueChart({ data, period, isLoading = false }: RevenueChartProps) {
  // Use real data from API
  const chartData = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Loading revenue data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            No revenue data available for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No data to display</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try selecting a different period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatXAxis = (value: string) => {
    if (!value) return '';
    return value;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Period
              </span>
              <span className="font-bold text-muted-foreground">
                {label || 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Revenue
              </span>
              <span className="font-bold text-green-600">
                ${payload[0]?.value?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Orders
              </span>
              <span className="font-bold text-blue-600">
                {payload[1]?.value?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>
          Revenue and order trends for the {period} period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="period"
                tickFormatter={formatXAxis}
                className="text-xs"
                stroke="#888888"
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#10b981"
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                className="text-xs"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>Orders</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}