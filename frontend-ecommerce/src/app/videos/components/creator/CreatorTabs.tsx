'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Creator } from '@/types/creator';
import { VideoCard } from '../player/VideoCard';
import { ProductCard } from '../product/ProductCard';
import { cn } from '@/lib/utils';

interface CreatorTabsProps {
  creator: Creator;
  className?: string;
}

export function CreatorTabs({ creator, className }: CreatorTabsProps) {
  const [activeTab, setActiveTab] = useState('videos');

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className={cn('space-y-4', className)}
    >
      <TabsList className="bg-[#151515] border border-[rgba(255,255,255,0.05)] p-1">
        <TabsTrigger
          value="videos"
          className="data-[state=active]:bg-[#FF3B5C] data-[state=active]:text-white text-[#A3A3A3]"
        >
          Videos
        </TabsTrigger>
        <TabsTrigger
          value="products"
          className="data-[state=active]:bg-[#FF3B5C] data-[state=active]:text-white text-[#A3A3A3]"
        >
          Products
        </TabsTrigger>
        <TabsTrigger
          value="about"
          className="data-[state=active]:bg-[#FF3B5C] data-[state=active]:text-white text-[#A3A3A3]"
        >
          About
        </TabsTrigger>
      </TabsList>

      <TabsContent value="videos" className="space-y-4">
        {creator.videos && creator.videos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {creator.videos.map((video) => (
              <VideoCard key={video.id} video={video} variant="horizontal" />
            ))}
          </div>
        ) : (
          <p className="text-center text-[#A3A3A3] py-8">No videos yet</p>
        )}
      </TabsContent>

      <TabsContent value="products" className="space-y-4">
        {creator.products && creator.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {creator.products.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        ) : (
          <p className="text-center text-[#A3A3A3] py-8">No products yet</p>
        )}
      </TabsContent>

      <TabsContent value="about" className="space-y-4">
        <div className="bg-[#151515] rounded-xl p-4 border border-[rgba(255,255,255,0.05)] space-y-4">
          <p className="text-white">{creator.bio}</p>
          <div className="space-y-2 text-sm text-[#A3A3A3]">
            <p>Member since {new Date(creator.createdAt).toLocaleDateString()}</p>
            {creator.storeName && (
              <p>Store: {creator.storeName}</p>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}