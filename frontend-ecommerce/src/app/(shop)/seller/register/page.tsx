'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, Store, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const phonePattern = /^[+]?[0-9]{8,15}$/;

const sellerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || phonePattern.test(value), {
      message: 'Please enter a valid phone number (8-15 digits)',
    }),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain uppercase, lowercase, and number',
    }),
  storeName: z.string().min(2, 'Store name must be at least 2 characters'),
  storePhone: z.string().refine((value) => phonePattern.test(value), {
    message: 'Please enter a valid store phone number (8-15 digits)',
  }),
  storeEmail: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Please enter a valid store email',
    }),
  storeAddress: z.string().min(10, 'Store address must be at least 10 characters'),
  description: z.string().optional(),
});

type SellerForm = z.infer<typeof sellerSchema>;

const perks = [
  {
    icon: Users,
    title: 'Reach customers nationwide',
    description: 'Get discovered by shoppers across every municipality in Timor-Leste.',
  },
  {
    icon: TrendingUp,
    title: 'Grow at your pace',
    description: 'List as many products as you like and manage everything from your seller dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted marketplace',
    description: 'Secure payments and admin-verified stores build buyer confidence.',
  },
];

export default function SellerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerForm>({
    resolver: zodResolver(sellerSchema),
  });

  const onSubmit = async (data: SellerForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { ...data };
      // class-validator's @IsOptional only skips null/undefined, not '' —
      // empty optional fields must be removed, not sent as ''.
      if (!payload.phone) delete payload.phone;
      if (!payload.storeEmail) delete payload.storeEmail;
      if (!payload.description) delete payload.description;

      await api.post('/sellers/register', payload);
      toast.success('Registration submitted! We\'ll review your store and email you once it\'s approved.');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 text-3xl font-bold">Become a Seller</h1>
          <p className="mt-2 text-muted-foreground">
            Open your store on E-commerce Timor-Leste and start selling to customers across the country.
          </p>
        </div>
        <div className="space-y-4">
          {perks.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.title} className="flex gap-3">
                <div className="h-fit rounded-full bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{perk.title}</p>
                  <p className="text-sm text-muted-foreground">{perk.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Store Registration</CardTitle>
          <CardDescription>
            Tell us about you and your store. We&apos;ll review your application and email you once it&apos;s approved.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Your account</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Maria Silva" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input id="phone" placeholder="+670 1234 5678" {...register('phone')} />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Your store</h3>
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input id="storeName" placeholder="Loja Timor Handicrafts" {...register('storeName')} />
                {errors.storeName && <p className="text-sm text-destructive">{errors.storeName.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Store Phone</Label>
                  <Input id="storePhone" placeholder="+670 8765 4321" {...register('storePhone')} />
                  {errors.storePhone && <p className="text-sm text-destructive">{errors.storePhone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Store Email (Optional)</Label>
                  <Input id="storeEmail" type="email" placeholder="loja@example.com" {...register('storeEmail')} />
                  {errors.storeEmail && <p className="text-sm text-destructive">{errors.storeEmail.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeAddress">Store Address</Label>
                <Textarea
                  id="storeAddress"
                  rows={2}
                  placeholder="Rua de Dili, Dili, Timor-Leste"
                  {...register('storeAddress')}
                />
                {errors.storeAddress && (
                  <p className="text-sm text-destructive">{errors.storeAddress.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">About Your Store (Optional)</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="What do you sell? What makes your store special?"
                  {...register('description')}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have a seller account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
