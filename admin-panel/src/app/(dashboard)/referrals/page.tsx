'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/shared/Pagination';
import { Users, CheckCircle2, Clock, DollarSign, Settings, Gift } from 'lucide-react';
import { useAdminReferrals, useAdminReferralStats, type ReferralStatus } from '@/hooks/useReferrals';

export default function AdminReferralsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<ReferralStatus | 'ALL'>('ALL');

  const { data: stats, isLoading: statsLoading } = useAdminReferralStats();
  const { data: list, isLoading: listLoading } = useAdminReferrals({
    page,
    limit,
    status: status === 'ALL' ? undefined : status,
  });

  const statCards = [
    { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Users },
    { label: 'Successful Referrals', value: stats?.successfulReferrals ?? 0, icon: CheckCircle2 },
    { label: 'Pending Referrals', value: stats?.pendingReferrals ?? 0, icon: Clock },
    { label: 'Rewards Issued', value: `$${(stats?.rewardsIssued ?? 0).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground">
            Referral signups, reward status, and wallet credit issued platform-wide.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/referrals/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-14" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Referrals</CardTitle>
            <CardDescription>{list?.total ?? 0} referral{(list?.total ?? 0) === 1 ? '' : 's'} recorded</CardDescription>
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ReferralStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REWARDED">Rewarded</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !list?.items || list.items.length === 0 ? (
            <div className="py-12 text-center">
              <Gift className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No referrals match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Rewarded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <p className="font-medium">{referral.referrer.name}</p>
                        <p className="text-xs text-muted-foreground">{referral.referrer.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{referral.referredUser.name}</p>
                        <p className="text-xs text-muted-foreground">{referral.referredUser.email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{referral.referralCodeUsed}</TableCell>
                      <TableCell>
                        <Badge variant={referral.status === 'REWARDED' ? 'default' : 'secondary'}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.rewardAmount != null ? `$${referral.rewardAmount.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        {referral.qualifyingOrder ? `#${referral.qualifyingOrder.orderNumber}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {referral.rewardedAt ? new Date(referral.rewardedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/referrals/${referral.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {list && list.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={list.totalPages}
              totalItems={list.total}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
