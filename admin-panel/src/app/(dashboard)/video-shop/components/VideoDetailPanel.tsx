'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Play, Package, BadgeCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminVideo,
  VideoStatus,
  VideoVisibility,
  useUpdateVideo,
  useUpdateVideoStatus,
} from '@/hooks/useVideos';
import { formatCurrency } from '@/lib/formatters';

interface VideoDetailPanelProps {
  video: AdminVideo | null;
  onClose: () => void;
  onPreview: (video: AdminVideo) => void;
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time — toISOString()
// gives UTC with seconds/millis, so this can't just slice it.
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VideoDetailPanel({ video, onClose, onPreview }: VideoDetailPanelProps) {
  const router = useRouter();
  const updateVideo = useUpdateVideo();
  const updateStatus = useUpdateVideoStatus();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VideoStatus>('PENDING');
  const [visibility, setVisibility] = useState<VideoVisibility>('PUBLIC');
  const [allowComments, setAllowComments] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  const [allowSave, setAllowSave] = useState(true);
  const [enableShopping, setEnableShopping] = useState(true);
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    if (!video) return;
    setTitle(video.title);
    setDescription(video.description ?? '');
    setStatus(video.status);
    setVisibility(video.visibility);
    setAllowComments(video.allowComments);
    setAllowLikes(video.allowLikes);
    setAllowSharing(video.allowSharing);
    setAllowSave(video.allowSave);
    setEnableShopping(video.enableShopping);
    setScheduledFor(video.status === 'SCHEDULED' ? toDatetimeLocalValue(video.publishedAt) : '');
  }, [video]);

  if (!video) return null;

  const isSaving = updateVideo.isPending;

  const handleSave = async () => {
    await updateVideo.mutateAsync({
      id: video.id,
      values: {
        title,
        description,
        status,
        visibility,
        allowComments,
        allowLikes,
        allowSharing,
        allowSave,
        enableShopping,
        publishedAt: status === 'SCHEDULED' ? scheduledFor : undefined,
      },
    });
  };

  const handleTogglePublish = async () => {
    await updateStatus.mutateAsync({
      id: video.id,
      status: video.status === 'PUBLISHED' ? 'PENDING' : 'PUBLISHED',
    });
  };

  const seller = video.product?.seller;
  const category = video.product?.category;

  return (
    <div className="flex h-full w-full flex-col border-l bg-background lg:w-[420px]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Tabs defaultValue="details" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="products">Products ({video.product ? 1 : 0})</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
            <TabsContent value="details" className="mt-0 space-y-5">
              <button
                type="button"
                onClick={() => onPreview(video)}
                className="group relative flex aspect-[9/16] max-h-64 w-full items-center justify-center overflow-hidden rounded-lg bg-muted"
              >
                {video.thumbnailUrl ? (
                  <Image src={video.thumbnailUrl} alt={video.title} fill sizes="420px" className="object-cover" unoptimized />
                ) : (
                  <Play className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Play className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                {category ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {category.name}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No linked product / category</p>
                )}
              </div>

              {seller && (
                <div className="space-y-2">
                  <Label>Seller</Label>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                        {seller.storeLogo ? (
                          <Image src={seller.storeLogo} alt={seller.storeName} fill sizes="36px" className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                            {seller.storeName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{seller.storeName}</p>
                          {seller.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(seller._count?.followers ?? 0).toLocaleString()} Followers
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/sellers/${seller.id}`)}>
                      View Seller
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as VideoStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === 'SCHEDULED' && (
                <div className="space-y-2">
                  <Label>Publish at</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-publishes to the customer feed at this time.
                  </p>
                </div>
              )}

              {status === 'PUBLISHED' && video.publishedAt && (
                <div className="space-y-2">
                  <Label>Published At</Label>
                  <p className="text-sm text-muted-foreground">{new Date(video.publishedAt).toLocaleString()}</p>
                </div>
              )}

              <div className="space-y-3 rounded-lg border p-3">
                <ToggleRow label="Allow Comments" checked={allowComments} onCheckedChange={setAllowComments} />
                <ToggleRow label="Allow Likes" checked={allowLikes} onCheckedChange={setAllowLikes} />
                <ToggleRow label="Allow Sharing" checked={allowSharing} onCheckedChange={setAllowSharing} />
                <ToggleRow label="Allow Save" checked={allowSave} onCheckedChange={setAllowSave} />
                <ToggleRow label="Enable Shopping" checked={enableShopping} onCheckedChange={setEnableShopping} />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(value) => setVisibility(value as VideoVisibility)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="UNLISTED">Unlisted</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-3">
              {video.product ? (
                <Link
                  href={`/products/${video.product.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {video.product.thumbnail ? (
                      <Image src={video.product.thumbnail} alt={video.product.name} fill sizes="56px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{video.product.name}</p>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(video.product.price)}</p>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No product linked to this video.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t p-4">
        <Button variant="outline" className="flex-1" onClick={() => onPreview(video)}>
          Preview
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={updateStatus.isPending}
          onClick={handleTogglePublish}
        >
          {video.status === 'PUBLISHED' ? (
            <>
              <EyeOff className="mr-1.5 h-4 w-4" /> Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-1.5 h-4 w-4" /> Publish
            </>
          )}
        </Button>
        <Button className="flex-1" disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
