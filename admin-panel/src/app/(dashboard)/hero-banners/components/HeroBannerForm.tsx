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
import { Loader2, Upload, ImageIcon } from 'lucide-react';
import {
  useCreateHeroBanner,
  useUpdateHeroBanner,
  useUploadHeroImage,
  type HeroBanner,
  type HeroBannerPayload,
} from '@/hooks/useHeroBanners';
import toast from 'react-hot-toast';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, or WEBP images are allowed';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller';
  }
  return null;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function BannerImageField({
  label,
  hint,
  imageUrl,
  isUploading,
  onUpload,
}: {
  label: string;
  hint: string;
  imageUrl: string;
  isUploading: boolean;
  onUpload: (file: File) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      toast.error(error);
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            width={400}
            height={300}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {imageUrl ? 'Replace' : 'Upload'}
        </Button>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

interface HeroBannerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: HeroBanner | null;
}

const EMPTY_FORM = {
  badge: '',
  title: '',
  subtitle: '',
  buttonText: '',
  buttonUrl: '',
  desktopImage: '',
  mobileImage: '',
  isActive: true,
  startDate: '',
  endDate: '',
};

export function HeroBannerForm({ open, onOpenChange, banner }: HeroBannerFormProps) {
  const isEdit = !!banner;
  const createBanner = useCreateHeroBanner();
  const updateBanner = useUpdateHeroBanner();
  const uploadImage = useUploadHeroImage();

  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingField, setUploadingField] = useState<'desktop' | 'mobile' | null>(null);

  useEffect(() => {
    if (!open) return;
    if (banner) {
      setForm({
        badge: banner.badge || '',
        title: banner.title,
        subtitle: banner.subtitle || '',
        buttonText: banner.buttonText || '',
        buttonUrl: banner.buttonUrl || '',
        desktopImage: banner.desktopImage,
        mobileImage: banner.mobileImage || '',
        isActive: banner.isActive,
        startDate: toDateInputValue(banner.startDate),
        endDate: toDateInputValue(banner.endDate),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, banner]);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (type: 'desktop' | 'mobile', file: File) => {
    setUploadingField(type);
    try {
      const result = await uploadImage.mutateAsync({ file, type });
      handleChange(type === 'desktop' ? 'desktopImage' : 'mobileImage', result.url);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!form.desktopImage) {
      toast.error('Desktop image is required');
      return;
    }

    const payload: HeroBannerPayload = {
      badge: form.badge.trim() || undefined,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      buttonText: form.buttonText.trim() || undefined,
      buttonUrl: form.buttonUrl.trim() || undefined,
      desktopImage: form.desktopImage,
      mobileImage: form.mobileImage || undefined,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };

    if (isEdit && banner) {
      await updateBanner.mutateAsync({ id: banner.id, data: payload });
    } else {
      await createBanner.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isSaving = createBanner.isPending || updateBanner.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Hero Banner' : 'Add Hero Banner'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <BannerImageField
              label="Desktop Image (required)"
              hint="Recommended 800×600. Shown beside the headline on the storefront hero."
              imageUrl={form.desktopImage}
              isUploading={uploadingField === 'desktop'}
              onUpload={(file) => handleUpload('desktop', file)}
            />
            <BannerImageField
              label="Mobile Image (optional)"
              hint="Recommended 800×450. Falls back to desktop image if unset."
              imageUrl={form.mobileImage}
              isUploading={uploadingField === 'mobile'}
              onUpload={(file) => handleUpload('mobile', file)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-badge">Badge (optional)</Label>
            <Input id="hero-badge" value={form.badge} onChange={(e) => handleChange('badge', e.target.value)} placeholder="e.g. WELCOME TO LOLOSPALA" />
            <p className="text-xs text-muted-foreground">Small pill shown above the headline on the storefront.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-title">Headline</Label>
            <Input id="hero-title" value={form.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g. Shop the best products in Timor-Leste" required />
            <p className="text-xs text-muted-foreground">Main heading shown on the storefront hero.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtitle (optional)</Label>
            <Input id="hero-subtitle" value={form.subtitle} onChange={(e) => handleChange('subtitle', e.target.value)} placeholder="e.g. Local products, trusted sellers, fast delivery to your door." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hero-button-text">Button Text (optional)</Label>
              <Input id="hero-button-text" value={form.buttonText} onChange={(e) => handleChange('buttonText', e.target.value)} placeholder="Shop Now" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-button-url">Link URL (optional)</Label>
              <Input id="hero-button-url" value={form.buttonUrl} onChange={(e) => handleChange('buttonUrl', e.target.value)} placeholder="/categories/electronics" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">Where customers land when they click the button or banner.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hero-start-date">Start Date (optional)</Label>
              <Input id="hero-start-date" type="date" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to show immediately.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-end-date">End Date (optional)</Label>
              <Input id="hero-end-date" type="date" value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to show indefinitely.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="hero-active" className="cursor-pointer">
              Active
            </Label>
            <Switch id="hero-active" checked={form.isActive} onCheckedChange={(v) => handleChange('isActive', v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Banner'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
