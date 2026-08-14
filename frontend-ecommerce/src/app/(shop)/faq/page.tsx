'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, ShoppingBag, Truck, CreditCard, RotateCcw, Store } from 'lucide-react';

const faqSections = [
  {
    title: 'Ordering',
    icon: ShoppingBag,
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse products, add the ones you want to your cart, then go to checkout. Fill in your delivery address and choose a payment method to complete the order.',
      },
      {
        q: 'Can I change or cancel an order after placing it?',
        a: 'You can cancel an order from My Orders while it is still Pending or Processing. Once it has shipped, contact the seller or our support team for help.',
      },
      {
        q: 'Do I need an account to buy something?',
        a: 'You need an account to check out, track orders, and save addresses — it only takes a minute to create one.',
      },
    ],
  },
  {
    title: 'Shipping',
    icon: Truck,
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Delivery time depends on the courier and your municipality. An estimate is shown at checkout before you confirm your order.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes — open My Orders and select the order to see its current status and tracking details.',
      },
      {
        q: 'Do you deliver outside Dili?',
        a: 'We deliver to municipalities across Timor-Leste. Available couriers and rates for your area are shown at checkout.',
      },
    ],
  },
  {
    title: 'Payment',
    icon: CreditCard,
    items: [
      {
        q: 'What payment methods are accepted?',
        a: 'Cash on Delivery (COD) and bank transfer are available, depending on what the seller and platform currently support for your order.',
      },
      {
        q: 'Is it safe to pay on this platform?',
        a: 'We don’t store your bank card details. Bank transfer orders are confirmed manually or automatically once payment is received.',
      },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: RotateCcw,
    items: [
      {
        q: 'Can I return a product?',
        a: 'Yes, in most cases within a limited window after delivery if the item is defective, damaged, or not as described. See our Returns & Refunds page for details.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Once a return is approved, refunds are processed back to your original payment method or as store credit, depending on the case.',
      },
    ],
  },
  {
    title: 'Selling',
    icon: Store,
    items: [
      {
        q: 'How do I become a seller?',
        a: 'Register your store from the Become a Seller page. Once approved, you can list products and start selling to customers across Timor-Leste.',
      },
      {
        q: 'Are there fees to sell on the platform?',
        a: 'A service fee applies to completed sales. Full details are shared with sellers once their store is approved.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Frequently Asked Questions</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Answers to common questions about ordering, shipping, payment, and selling on E-commerce Timor-Leste.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {faqSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {section.items.map((item, index) => (
                    <AccordionItem key={index} value={`${section.title}-${index}`}>
                      <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="rounded-2xl bg-muted/30 p-8 text-center">
        <h2 className="text-xl font-semibold">Still need help?</h2>
        <p className="mt-2 text-muted-foreground">
          Can&apos;t find the answer you&apos;re looking for? Our support team is here for you.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/help">Visit Help Center</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
