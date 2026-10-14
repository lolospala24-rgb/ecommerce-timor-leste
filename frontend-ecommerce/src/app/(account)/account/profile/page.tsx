'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Lock } from 'lucide-react';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';
import { getInitials } from '@/lib/formatters';
import toast from 'react-hot-toast';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { MenuRow } from '@/components/account/MenuRow';
import { ChangePasswordDialog } from '@/components/account/ChangePasswordDialog';

const profileSchema = z.object({
  name: z.string().min(2, 'Naran tenke iha sekarea 2 ka liu'),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Phone is stored with its +670 prefix, but the UI shows that prefix as a
// fixed box (per design) — strip it for the editable field and re-add it
// on submit so the stored format never changes.
const stripPrefix = (phone?: string | null) => (phone || '').replace(/^\+670\s*/, '');

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: stripPrefix(user?.phone),
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      const localPhone = data.phone?.trim();
      const payload = {
        name: data.name,
        phone: localPhone ? `+670 ${localPhone}` : undefined,
      };
      const response = await api.patch('/users/profile', payload);
      setUser(unwrapApiData(response?.data));
      toast.success('Profile atualiza ona');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'La konsege atualiza profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AccountAppBar title="Perfil" backHref="/account" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-2 pt-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Informasaun pesoál</p>

          <div className="space-y-2">
            <Label htmlFor="name">Naran kompletu</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input id="email" value={user?.email} disabled className="bg-muted pr-9" />
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Email la bele troka.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numeru telefone</Label>
            <div className="flex gap-2">
              <span className="flex h-10 shrink-0 items-center rounded-lg border bg-muted px-3 text-sm font-medium text-foreground">
                +670
              </span>
              <Input id="phone" placeholder="7xxx xxxx" {...register('phone')} />
            </div>
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">
          <MenuRow icon={Lock} title="Troka password" onClick={() => setChangePasswordOpen(true)} />
        </div>

        <div className="sticky bottom-0 -mx-4 bg-background px-4 pb-1 pt-3 md:static md:mx-0 md:px-0">
          <Button type="submit" className="w-full" disabled={isLoading || !isDirty}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rai hela...
              </>
            ) : (
              'Rai mudansa'
            )}
          </Button>
        </div>
      </form>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
