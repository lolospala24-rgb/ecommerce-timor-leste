import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern buying and selling on E-commerce Timor-Leste.',
};

const LAST_UPDATED = '27 August 2026';

export default function TermsPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center md:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Terms of Service</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </section>

      <Card>
        <CardContent className="space-y-8 p-6 text-sm leading-relaxed text-muted-foreground md:p-10">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of E-commerce Timor-Leste
            (the &quot;Platform&quot;), operated to connect buyers with independent sellers across
            Timor-Leste. By creating an account, browsing, or placing an order, you agree to these
            Terms. If you do not agree, please do not use the Platform.
          </p>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. The Platform is a marketplace</h2>
            <p>
              E-commerce Timor-Leste is a marketplace: most products are listed and sold by
              independent third-party sellers, not by the Platform itself. The Platform provides
              the storefront, checkout, and payment-confirmation tools that connect buyers and
              sellers, but each seller is responsible for the accuracy of their own product
              listings, the quality and legality of what they sell, and fulfilling orders they
              accept. Where the Platform itself acts as a direct seller, these Terms apply to that
              sale the same way.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Accounts</h2>
            <p>
              You must provide accurate registration information and keep your password secure.
              You are responsible for activity on your account. You must be at least 18 years old,
              or have a parent or guardian&apos;s consent, to create an account or place an order.
              We may suspend or close an account that we reasonably believe is being used
              fraudulently, abusively, or in violation of these Terms.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Orders and pricing</h2>
            <p>
              Placing an order is an offer to buy at the price and quantity shown at checkout.
              Prices, stock, and shipping costs are set by the seller (or the Platform, for its own
              listings) and can change before an order is placed; the price shown at checkout is
              what applies once the order is confirmed. An order is confirmed once you complete
              checkout and, for Bank Transfer orders, remains subject to payment verification as
              described below.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Payment</h2>
            <p>
              The Platform currently supports two payment methods: <strong>Cash on Delivery
              (COD)</strong>, where you pay the courier when your order arrives, and{' '}
              <strong>Bank Transfer</strong>, where you transfer the order total to the bank
              account shown at checkout and upload a receipt for verification. A Bank Transfer
              order is confirmed once an administrator verifies your receipt; orders left
              unverified for an extended period may be automatically cancelled. We do not store
              your bank card details — we never ask for them, since no card payment method is
              offered today.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Shipping and delivery</h2>
            <p>
              Estimated delivery times shown at checkout are estimates, not guarantees, and depend
              on the courier, your municipality, and the seller&apos;s processing time. Risk of
              loss passes to you once an order is marked delivered, except where a return is
              accepted under our{' '}
              <Link href="/returns" className="font-medium text-foreground underline">
                Returns &amp; Refunds Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">6. Returns, refunds, and cancellations</h2>
            <p>
              Returns and refunds are handled as described in our{' '}
              <Link href="/returns" className="font-medium text-foreground underline">
                Returns &amp; Refunds Policy
              </Link>
              , which forms part of these Terms. Specific return windows or final-sale conditions
              for an item are shown on its product page where they differ from the general policy.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">7. Product listings and reviews</h2>
            <p>
              Sellers are responsible for the accuracy of their listings. If a product you receive
              is materially different from its listing, use the return process or contact support.
              Reviews you post must reflect your genuine experience; we may remove reviews that are
              fraudulent, abusive, or unrelated to the product.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">8. Acceptable use</h2>
            <p>
              You agree not to use the Platform to: violate any applicable law; infringe
              intellectual property or other rights; upload false payment proof or otherwise
              attempt to defraud a seller, buyer, or the Platform; scrape or disrupt the service;
              or list or purchase goods prohibited under Timor-Leste law.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">9. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, the Platform is provided on an
              &quot;as-is&quot; basis. Because most goods are sold by independent sellers, the
              Platform&apos;s liability for a transaction is limited to facilitating a resolution
              (refund, replacement, or account action against the seller) rather than acting as the
              underlying seller, except for products the Platform sells directly.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">10. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time; the &quot;Last updated&quot; date above
              will change accordingly. Continued use of the Platform after an update means you
              accept the revised Terms.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">11. Governing law</h2>
            <p>
              These Terms are governed by the laws of the Democratic Republic of Timor-Leste.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">12. Contact</h2>
            <p>
              Questions about these Terms can be sent via our{' '}
              <Link href="/contact" className="font-medium text-foreground underline">
                Contact page
              </Link>
              , or see our{' '}
              <Link href="/privacy" className="font-medium text-foreground underline">
                Privacy Policy
              </Link>{' '}
              for how we handle your data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
