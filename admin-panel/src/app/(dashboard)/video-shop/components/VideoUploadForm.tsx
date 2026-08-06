'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { UploadCloud, WandSparkles, Loader2 } from 'lucide-react';

interface ProductOption {
  id: number;
  name: string;
}

interface VideoUploadFormProps {
  onSaved?: () => void;
}

export function VideoUploadForm({ onSaved }: VideoUploadFormProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=100');
        const result = await response.json();
        if (result?.success) {
          const list = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
          setProducts(list.map((item: { id: number; name: string }) => ({ id: item.id, name: item.name })));
        }
      } catch (error) {
        console.error('Failed to load products for video form', error);
      }
    };

    loadProducts();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isActive', String(isActive));
      if (productId) formData.append('productId', productId);
      if (videoFile) formData.append('video', videoFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to save video');
      }

      setMessage('Video berhasil disimpan ke backend.');
      setTitle('');
      setDescription('');
      setProductId('');
      setIsActive(true);
      setVideoFile(null);
      setThumbnailFile(null);
      if (onSaved) onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UploadCloud className="h-5 w-5 text-primary" />
          Upload & Edit Video
        </CardTitle>
        <p className="text-sm text-muted-foreground">Pilih produk terkait, atur status publish/draft, dan kirim data ke backend.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Judul video</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Smartphone XYZ Pro Demo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Produk terkait</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsikan konten video dan manfaat produk." />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="video-file">File video</Label>
              <Input id="video-file" type="file" accept="video/*" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail-file">Thumbnail</Label>
              <Input id="thumbnail-file" type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Publish</p>
              <p className="text-sm text-muted-foreground">Tentukan apakah video langsung tampil di halaman user.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
