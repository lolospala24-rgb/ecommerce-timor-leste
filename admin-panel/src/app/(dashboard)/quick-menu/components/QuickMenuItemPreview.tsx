'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone } from 'lucide-react';
import type { QuickMenuItem } from '@/hooks/useQuickMenu';
import { QuickMenuIconDisplay } from './QuickMenuIconDisplay';

interface QuickMenuItemPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: QuickMenuItem | null;
}

// Renders the item the same way the real homepage QuickMenu tile does
// (icon circle, title, subtitle, badge) — actual data, not a mockup — at
// two sizes so the admin can sanity-check both breakpoints before saving.
function PreviewTile({ item, size }: { item: QuickMenuItem; size: 'sm' | 'lg' }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 text-center">
      <div className="relative">
        <QuickMenuIconDisplay iconType={item.iconType} iconKey={item.iconKey} iconUrl={item.iconUrl} size={size === 'lg' ? 'lg' : 'md'} />
        {item.badge && (
          <Badge className="absolute -right-2 -top-1.5 bg-red-600 px-1.5 py-0 text-[9px] leading-4 text-white hover:bg-red-600">
            {item.badge}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-xs font-medium leading-tight text-foreground">{item.title}</p>
        {item.subtitle && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{item.subtitle}</p>}
      </div>
    </div>
  );
}

export function QuickMenuItemPreview({ open, onOpenChange, item }: QuickMenuItemPreviewProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="desktop">
          <TabsList>
            <TabsTrigger value="desktop" className="gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop">
            <div className="flex items-center justify-center gap-8 rounded-xl border bg-muted/20 p-8">
              <PreviewTile item={item} size="lg" />
            </div>
          </TabsContent>
          <TabsContent value="mobile">
            <div className="mx-auto flex max-w-[220px] items-center justify-center gap-6 rounded-xl border bg-muted/20 p-6">
              <PreviewTile item={item} size="sm" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5 rounded-md border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destination</span>
            <span className="font-mono text-xs">{item.link}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{item.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
