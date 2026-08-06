"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getSellerProfile, getSellerProducts, type SellerProfile, type SellerProduct } from '@/services/video.service';
import { CheckCircle2, ArrowLeft, ShoppingCart } from 'lucide-react';

export default function SellerProfilePage() {
  const params = useParams<{ sellerId: string }>();
  const sellerId = params?.sellerId;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    let mounted = true;

    const load = async () => {
      try {
        const [seller, sellerProducts] = await Promise.all([
          getSellerProfile(sellerId),
          getSellerProducts(sellerId, 1, 12),
        ]);

        if (mounted) {
          setProfile(seller);
          setProducts(sellerProducts.items);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Unable to load seller profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [sellerId]);

  if (loading) {
    return <div className="min-h-screen bg-black p-6 text-white">Loading seller profile...</div>;
  }

  if (error || !profile) {
    return <div className="min-h-screen bg-black p-6 text-white">{error || 'Seller profile not found.'}</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <Link href="/videos" className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to videos
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="h-36 bg-gradient-to-r from-sky-500/40 to-fuchsia-500/40" />
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/20">
                  <AvatarImage src={profile.storeLogo || ''} alt={profile.storeName} />
                  <AvatarFallback>{profile.storeName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold">{profile.storeName}</h1>
                    {profile.isVerified ? <CheckCircle2 className="h-5 w-5 text-sky-400" /> : null}
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-white/70">{profile.description || 'Verified seller on the platform.'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{profile._count?.products ?? 0} products</Badge>
                <Badge variant="outline">Verified seller</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Products by this seller</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 aspect-video overflow-hidden rounded-xl bg-white/10">
                  <img src={product.thumbnail || '/images/placeholder.png'} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="mt-1 text-sm text-white/70">{product.description}</p>
                  </div>
                  <button className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-semibold">${Number(product.price ?? 0).toFixed(2)}</span>
                  <span className="text-sm text-white/60">{product.totalReviews ?? 0} reviews</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
