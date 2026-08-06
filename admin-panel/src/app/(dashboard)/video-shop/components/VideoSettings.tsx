import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, Image as ImageIcon } from 'lucide-react';

export function VideoSettings() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-5 w-5 text-primary" />
            Pengaturan Umum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Autoplay</p>
              <p className="text-sm text-muted-foreground">Putar video secara otomatis saat halaman dibuka.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Mute default</p>
              <p className="text-sm text-muted-foreground">Video dimulai dalam mode senyap.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Infinite scroll</p>
              <p className="text-sm text-muted-foreground">Buka feed video tanpa batas.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Lazy loading</p>
              <p className="text-sm text-muted-foreground">Muati video saat dibutuhkan.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-5 w-5 text-primary" />
            Kategori & Banner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Input placeholder="Contoh: New Arrival, Best Seller" />
          </div>
          <div className="space-y-2">
            <Label>Banner opsional</Label>
            <Input type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label>Catatan banner</Label>
            <Textarea placeholder="Tampilkan promo atau penawaran khusus di bagian atas feed." />
          </div>
          <Button>Simpan Pengaturan</Button>
        </CardContent>
      </Card>
    </div>
  );
}
