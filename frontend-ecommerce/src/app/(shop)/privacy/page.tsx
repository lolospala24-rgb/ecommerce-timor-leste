import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data E-commerce Timor-Leste collects and how it is used.',
};

const LAST_UPDATED = '27 August 2026';

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center md:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Privacy Policy</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </section>

      <Card>
        <CardContent className="space-y-8 p-6 text-sm leading-relaxed text-muted-foreground md:p-10">
          <p>
            This Privacy Policy explains what information E-commerce Timor-Leste (the
            &quot;Platform&quot;) collects, why, and how it is used, so you can make an informed
            choice about using the Platform.
          </p>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account information:</strong> name, email address, phone number, and
                password (stored encrypted, never in plain text), or your Google account name,
                email, and profile photo if you sign in with Google.
              </li>
              <li>
                <strong>Order and delivery information:</strong> delivery address, recipient name
                and phone number, and — only if you use the &quot;Pin exact location&quot; map
                feature — the coordinates you drop, to help your courier find you.
              </li>
              <li>
                <strong>Payment-related information:</strong> the payment method you choose and,
                for Bank Transfer orders, the receipt image you upload for verification. We do not
                collect or store bank card numbers, since no card payment method is offered.
              </li>
              <li>
                <strong>Usage information stored on your device:</strong> your cart contents (so it
                survives a page reload), wishlist, recently viewed products, language and currency
                preference, and which notifications you&apos;ve read — kept in your browser&apos;s
                local storage, not on our servers, until you clear it or it's synced to your
                account after logging in.
              </li>
              <li>
                <strong>Content you provide:</strong> product reviews, seller ratings, and any
                messages you send through support or comment features.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. How we use this information</h2>
            <p>
              We use your information to: create and secure your account; process and deliver
              orders; verify Bank Transfer payments; show you order status and delivery updates;
              respond to support requests; and show relevant products, categories, and your order
              history when you're logged in. We do not sell your personal information to third
              parties.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Who we share it with</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Sellers</strong>, for the specific order you place with them — enough to
                fulfil and ship it (name, delivery address, phone number, order contents).
              </li>
              <li>
                <strong>Couriers</strong>, to deliver your order — your delivery address, phone
                number, and pinned location if provided.
              </li>
              <li>
                <strong>Service providers</strong> who host infrastructure on our behalf: Cloudinary
                (stores product images and uploaded payment receipts), and Google (Maps and
                Places, for the address/location picker at checkout; Firebase, if you sign in with
                Google). These providers process data only to provide their service to us.
              </li>
              <li>
                We may disclose information if required by law, or to investigate fraud or protect
                the security of the Platform.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Cookies and local storage</h2>
            <p>
              We use an essential, httpOnly authentication cookie to keep you signed in — it isn't
              readable by page scripts and isn't used for advertising. We also use your
              browser&apos;s local storage (not a tracking cookie) to remember your cart, wishlist,
              language, and similar preferences on your own device. We do not currently use
              third-party advertising or analytics cookies.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Data retention</h2>
            <p>
              We keep account and order information for as long as your account is active and as
              needed to meet legal, accounting, or dispute-resolution obligations (for example,
              records of a completed sale). You can ask us to delete your account as described
              below; some order records may be retained where required by law.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">6. Your choices</h2>
            <p>
              You can review and update your account details from{' '}
              <Link href="/account/profile" className="font-medium text-foreground underline">
                Account Settings
              </Link>{' '}
              at any time. To request a copy of your data or ask us to delete your account, contact
              us using the details below — we'll respond as required by applicable law.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">7. Children</h2>
            <p>
              The Platform is not directed at children, and accounts require a minimum age of 18
              (or a parent/guardian&apos;s consent, per our{' '}
              <Link href="/terms" className="font-medium text-foreground underline">
                Terms of Service
              </Link>
              ).
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">8. Changes to this policy</h2>
            <p>
              If we make material changes to this policy, we&apos;ll update the &quot;Last
              updated&quot; date above and, where appropriate, notify you directly.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-foreground">9. Contact</h2>
            <p>
              For any privacy question or request, reach us through our{' '}
              <Link href="/contact" className="font-medium text-foreground underline">
                Contact page
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
