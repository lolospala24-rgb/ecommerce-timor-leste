'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import {
  ShoppingBag,
  Truck,
  Shield,
  Users,
  Heart,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  CreditCard,
  Store
} from 'lucide-react';

export default function AboutPage() {
  const { data: settings, isLoading: settingsLoading } = usePublicSettings();

  const features = [
    {
      icon: ShoppingBag,
      title: 'Wide Selection',
      description: 'Browse thousands of products from trusted sellers across Timor-Leste.'
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      description: 'Reliable shipping to all municipalities with real-time tracking.'
    },
    {
      icon: Shield,
      title: 'Secure Shopping',
      description: 'Safe and secure transactions with multiple payment options.'
    },
    {
      icon: Users,
      title: 'Local Community',
      description: 'Support local businesses and connect with sellers in your area.'
    },
  ];

  const values = [
    {
      title: 'Empowering Local Businesses',
      description: 'We provide a platform for Timorese entrepreneurs to reach customers nationwide.',
      icon: Store,
    },
    {
      title: 'Customer First',
      description: 'Your satisfaction is our priority. We strive to provide the best shopping experience.',
      icon: Heart,
    },
    {
      title: 'Trust & Transparency',
      description: 'We believe in honest business practices and building trust with our community.',
      icon: Shield,
    },
    {
      title: 'Community Growth',
      description: 'We are committed to growing Timor-Leste\'s digital economy and creating opportunities.',
      icon: Globe,
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              E-commerce Timor-Leste
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            Your trusted online marketplace connecting buyers and sellers across Timor-Leste.
            We're building a vibrant digital economy for our nation.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sellers">Become a Seller</Link>
            </Button>
          </div>
        </div>
        {/* Background Decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
      </section>

      {/* Our Mission */}
      <section>
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold">Our Mission</h2>
            <p className="mt-4 text-muted-foreground">
              To create a thriving online marketplace that connects Timorese businesses with customers,
              fosters economic growth, and makes shopping convenient and accessible for everyone in Timor-Leste.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <span>Support local businesses and entrepreneurs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <span>Provide a safe and trusted shopping experience</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <span>Drive digital transformation in Timor-Leste</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Globe className="h-24 w-24 text-primary/40" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">Timor-Leste</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">Why Shop With Us</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Our Values */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">Our Values</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 rounded-2xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold">1. Browse Products</h3>
            <p className="text-sm text-muted-foreground">
              Explore thousands of products from trusted sellers
            </p>
          </div>
          <div className="text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold">2. Place Order</h3>
            <p className="text-sm text-muted-foreground">
              Choose your payment method and complete checkout
            </p>
          </div>
          <div className="text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Truck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="mt-4 font-semibold">3. Receive Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Track your order and receive it at your doorstep
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">Get In Touch</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <a
                  href={`mailto:${settings?.contactEmail || 'support@ecommercetimor.com'}`}
                  className="text-primary hover:underline"
                >
                  {settings?.contactEmail || 'support@ecommercetimor.com'}
                </a>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Phone</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <a
                  href={`tel:${(settings?.contactPhone || '+670 1234 5678').replace(/\s+/g, '')}`}
                  className="text-primary hover:underline"
                >
                  {settings?.contactPhone || '+670 1234 5678'}
                </a>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Address</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <Skeleton className="h-5 w-36" />
              ) : (
                <p className="text-muted-foreground">{settings?.address || 'Dili, Timor-Leste'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold">Ready to Start Shopping?</h2>
          <p className="mt-2 text-primary-foreground/80">
            Join thousands of satisfied customers in Timor-Leste
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </section>
    </div>
  );
}