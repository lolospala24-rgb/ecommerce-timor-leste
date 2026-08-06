'use client';

import { Creator } from '@/types/creator';
import { cn } from '@/lib/utils';

interface CreatorStatsProps {
  creator: Creator;
  className?: string;
}

export function CreatorStats({ creator, className }: CreatorStatsProps) {
  const stats = [
    {
      label: 'Followers',
      value: (creator?.followers ?? 0).toLocaleString(),
    },
    {
      label: 'Following',
      value: (creator?.following ?? 0).toLocaleString(),
    },
    {
      label: 'Likes',
      value: (creator?.likes ?? 0).toLocaleString(),
    },
    {
      label: 'Videos',
      value: creator.videos?.length || 0,
    },
    {
      label: 'Products',
      value: creator.products?.length || 0,
    },
  ];

  return (
    <div className={cn('grid grid-cols-3 md:grid-cols-5 gap-2', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="text-center p-2 bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.05)]"
        >
          <p className="text-sm font-semibold text-white">{stat.value}</p>
          <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}