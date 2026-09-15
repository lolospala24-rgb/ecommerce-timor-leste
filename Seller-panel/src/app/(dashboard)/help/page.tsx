import { Mail, MessageCircle, Phone, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

const FAQS = [
  {
    q: 'How long until my store is verified?',
    a: 'New seller accounts are reviewed by our team, usually within 1-2 business days. You can still browse your dashboard while waiting, but creating products is disabled until verification is complete.',
  },
  {
    q: 'When do I actually get paid?',
    a: 'Earnings move from Pending to Available once an order is marked Completed (delivered). From there, request a payout anytime from Finance → Payouts — make sure your bank details are saved in Store Settings first.',
  },
  {
    q: 'Why was my payout amount capped?',
    a: 'You can only request up to your current Available balance. Amounts still marked Pending or Processing (reserved by an existing request) aren’t withdrawable yet.',
  },
  {
    q: 'A customer wants to cancel or return an order — what do I do?',
    a: 'Cancelling an order automatically restores stock and refunds the customer if payment was already received. Refund requests initiated by the customer show up against the relevant order.',
  },
  {
    q: 'How is the platform commission calculated?',
    a: 'A commission rate is applied per order at the time it’s delivered — you can see the exact commission amount and your net earnings on each order’s detail page.',
  },
];

const CHANNELS = [
  { icon: Mail, label: 'Email support', value: 'sellers@shoplylospala.com', href: 'mailto:sellers@shoplylospala.com' },
  { icon: Phone, label: 'Phone / WhatsApp', value: '+670 7723 4567', href: 'tel:+67077234567' },
  { icon: MessageCircle, label: 'Live chat', value: 'Available 9am–6pm, Mon–Sat', href: undefined },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Help & Support" description="Answers to common questions, and how to reach us." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-lg border bg-card p-4 open:pb-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                {item.q}
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-medium">Contact Us</h3>
            <div className="space-y-3">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;
                const content = (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <Icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{channel.label}</p>
                      <p className="text-sm text-muted-foreground">{channel.value}</p>
                    </div>
                  </div>
                );
                return channel.href ? (
                  <a key={channel.label} href={channel.href} className="block rounded-md transition-colors hover:bg-accent/50 -mx-1 px-1 py-0.5">
                    {content}
                  </a>
                ) : (
                  <div key={channel.label}>{content}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
