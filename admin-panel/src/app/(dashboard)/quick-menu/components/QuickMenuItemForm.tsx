'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Upload, ImageIcon, Check } from 'lucide-react';
import {
  useCreateQuickMenuItem,
  useUpdateQuickMenuItem,
  useUploadQuickMenuIcon,
  type QuickMenuItem,
  type QuickMenuItemPayload,
  type QuickMenuIconType,
  type QuickMenuLinkType,
} from '@/hooks/useQuickMenu';
import { QUICK_MENU_ICON_LIBRARY } from '@/lib/quickMenuIcons';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const ALLOWED_ICON_TYPES = ['image/svg+xml', 'image/png', 'image/webp'];

function validateIcon(file: File): string | null {
  if (!ALLOWED_ICON_TYPES.includes(file.type)) {
    return 'Only SVG, PNG, or WEBP icons are allowed';
  }
  if (file.size > MAX_ICON_BYTES) {
    return 'Icon must be 2MB or smaller';
  }
  return null;
}

interface QuickMenuItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: QuickMenuItem | null;
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  iconType: 'LIBRARY' as QuickMenuIconType,
  iconKey: QUICK_MENU_ICON_LIBRARY[0].key,
  iconUrl: '',
  linkType: 'INTERNAL' as QuickMenuLinkType,
  link: '',
  badge: '',
  openInNewTab: false,
  isActive: true,
  startDate: '',
  endDate: '',
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function QuickMenuItemForm({ open, onOpenChange, item }: QuickMenuItemFormProps) {
  const isEdit = !!item;
  const createItem = useCreateQuickMenuItem();
  const updateItem = useUpdateQuickMenuItem();
  const uploadIcon = useUploadQuickMenuIcon();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        title: item.title,
        subtitle: item.subtitle || '',
        iconType: item.iconType,
        iconKey: item.iconKey || QUICK_MENU_ICON_LIBRARY[0].key,
        iconUrl: item.iconUrl || '',
        linkType: item.linkType,
        link: item.link,
        badge: item.badge || '',
        openInNewTab: item.openInNewTab,
        isActive: item.isActive,
        startDate: toDateInputValue(item.startDate),
        endDate: toDateInputValue(item.endDate),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, item]);

  const handleChange = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const error = validateIcon(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadIcon.mutateAsync(file);
      handleChange('iconUrl', result.url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.iconType === 'LIBRARY' && !form.iconKey) {
      toast.error('Please choose an icon from the library');
      return;
    }
    if (form.iconType === 'UPLOAD' && !form.iconUrl) {
      toast.error('Please upload an icon');
      return;
    }
    if (!form.link.trim()) {
      toast.error('Destination is required');
      return;
    }
    if (form.linkType === 'INTERNAL' && !form.link.startsWith('/')) {
      toast.error('Internal destination must start with "/", e.g. /products');
      return;
    }
    if (form.linkType === 'EXTERNAL') {
      try {
        new URL(form.link);
      } catch {
        toast.error('External destination must be a valid URL, e.g. https://example.com');
        return;
      }
    }

    const payload: QuickMenuItemPayload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      iconType: form.iconType,
      iconKey: form.iconType === 'LIBRARY' ? form.iconKey : undefined,
      iconUrl: form.iconType === 'UPLOAD' ? form.iconUrl : undefined,
      linkType: form.linkType,
      link: form.link.trim(),
      badge: form.badge.trim() || undefined,
      openInNewTab: form.openInNewTab,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };

    if (isEdit && item) {
      await updateItem.mutateAsync({ id: item.id, data: payload });
    } else {
      await createItem.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Quick Menu Item' : 'Add Quick Menu Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="qm-title">Title</Label>
            <Input
              id="qm-title"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. All Products"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qm-subtitle">Subtitle (optional)</Label>
            <Input
              id="qm-subtitle"
              value={form.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="e.g. Browse all products"
            />
          </div>

          {/* Icon source */}
          <div className="space-y-3 rounded-md border p-3">
            <Label>Icon Source</Label>
            <RadioGroup
              value={form.iconType}
              onValueChange={(v) => handleChange('iconType', v as QuickMenuIconType)}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="LIBRARY" id="qm-icon-library" />
                <Label htmlFor="qm-icon-library" className="cursor-pointer font-normal">
                  Lolospala Icon Library
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="UPLOAD" id="qm-icon-upload" />
                <Label htmlFor="qm-icon-upload" className="cursor-pointer font-normal">
                  Upload Custom Icon
                </Label>
              </div>
            </RadioGroup>

            {form.iconType === 'LIBRARY' ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {QUICK_MENU_ICON_LIBRARY.map((def) => {
                  const Icon = def.icon;
                  const isSelected = form.iconKey === def.key;
                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => handleChange('iconKey', def.key)}
                      title={def.label}
                      className={cn(
                        'relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors hover:bg-muted/50',
                        isSelected && 'border-primary bg-primary/5',
                      )}
                    >
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', def.color)}>
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <span className="line-clamp-1 text-[10px] text-muted-foreground">{def.label}</span>
                      {isSelected && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex aspect-square w-28 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : form.iconUrl ? (
                    <div className="relative h-full w-full">
                      <Image src={form.iconUrl} alt="Icon preview" fill className="object-contain p-2" unoptimized />
                    </div>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {form.iconUrl ? 'Replace' : 'Upload Icon'}
                  </Button>
                  {form.iconUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleChange('iconUrl', '')}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">SVG / PNG / WEBP, max 2MB. 512×512 recommended, transparent background preferred.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_ICON_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-3 rounded-md border p-3">
            <Label>Link Type</Label>
            <RadioGroup
              value={form.linkType}
              onValueChange={(v) => handleChange('linkType', v as QuickMenuLinkType)}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="INTERNAL" id="qm-link-internal" />
                <Label htmlFor="qm-link-internal" className="cursor-pointer font-normal">
                  Internal Route
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="EXTERNAL" id="qm-link-external" />
                <Label htmlFor="qm-link-external" className="cursor-pointer font-normal">
                  External URL
                </Label>
              </div>
            </RadioGroup>
            <div className="space-y-2">
              <Label htmlFor="qm-link">Destination</Label>
              <Input
                id="qm-link"
                value={form.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder={form.linkType === 'INTERNAL' ? '/products' : 'https://example.com'}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="qm-new-tab" className="cursor-pointer font-normal">
                Open in New Tab
              </Label>
              <Switch id="qm-new-tab" checked={form.openInNewTab} onCheckedChange={(v) => handleChange('openInNewTab', v)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qm-badge">Badge (optional)</Label>
              <Input
                id="qm-badge"
                value={form.badge}
                onChange={(e) => handleChange('badge', e.target.value)}
                placeholder="e.g. NEW, HOT, SALE, LOCAL"
              />
              <p className="text-xs text-muted-foreground">Leave blank to show no badge.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qm-start-date">Start Date (optional)</Label>
              <Input id="qm-start-date" type="date" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to show immediately.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qm-end-date">End Date (optional)</Label>
              <Input id="qm-end-date" type="date" value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to show indefinitely.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="qm-active" className="cursor-pointer">
              Active
            </Label>
            <Switch id="qm-active" checked={form.isActive} onCheckedChange={(v) => handleChange('isActive', v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isUploading}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Quick Menu Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
