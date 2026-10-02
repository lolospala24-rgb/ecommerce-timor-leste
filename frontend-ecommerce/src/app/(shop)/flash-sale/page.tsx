import type { Metadata } from 'next';
import { FlashSalePageContent } from '@/components/home/FlashSalePageContent';

export const metadata: Metadata = {
  title: 'Flash Sale | Lolospala',
  description: 'Nikmati harga spesial dengan stok terbatas — Flash Sale Lolospala, Merkadu Dijitál Timor-Leste.',
};

export default function FlashSalePage() {
  return <FlashSalePageContent />;
}
