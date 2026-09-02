// Small, dependency-free HTML templates for the transactional emails that
// are actually gated by an admin Settings toggle. Kept as plain template
// functions rather than a templating engine (no .hbs compiler in this repo)
// to match KISS — there's nothing here beyond string interpolation.

const layout = (title: string, bodyHtml: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">E-commerce Timor-Leste</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#111827;">
                <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
                This is an automated message, please do not reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const money = (value: number) => `$${Number(value ?? 0).toFixed(2)}`;

export function orderConfirmationTemplate(params: {
  customerName: string;
  orderNumber: string;
  items: { name: string; quantity: number; total: number }[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  serviceFee: number;
  total: number;
}) {
  const rows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">${item.name} × ${item.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.total)}</td>
        </tr>`,
    )
    .join('');

  const body = `
    <p>Hi ${params.customerName},</p>
    <p>Thanks for your order! We've received order <strong>${params.orderNumber}</strong> and it's now being processed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
      ${rows}
      <tr><td style="padding-top:10px;">Subtotal</td><td style="padding-top:10px;text-align:right;">${money(params.subtotal)}</td></tr>
      <tr><td>Shipping</td><td style="text-align:right;">${money(params.shippingCost)}</td></tr>
      <tr><td>Tax</td><td style="text-align:right;">${money(params.taxAmount)}</td></tr>
      <tr><td>Service Fee</td><td style="text-align:right;">${money(params.serviceFee)}</td></tr>
      <tr><td style="font-weight:bold;padding-top:6px;">Total</td><td style="font-weight:bold;padding-top:6px;text-align:right;">${money(params.total)}</td></tr>
    </table>`;

  return layout('Order Confirmed', body);
}

export function paymentConfirmationTemplate(params: {
  customerName: string;
  orderNumber: string;
  amount: number;
}) {
  const body = `
    <p>Hi ${params.customerName},</p>
    <p>We've confirmed your payment of <strong>${money(params.amount)}</strong> for order
    <strong>${params.orderNumber}</strong>. Your order is now being prepared.</p>`;
  return layout('Payment Confirmed', body);
}

// Per-status copy for the order status email — keyed by OrderStatus. Kept
// here (not inline in the template function) so the subject line
// (MailService.sendOrderStatusUpdate) and the email heading always say the
// same thing, via getOrderStatusEmailHeading below.
const ORDER_STATUS_COPY: Record<string, { heading: string; message: (orderNumber: string) => string }> = {
  PAID: {
    heading: 'Payment Confirmed',
    message: (n) => `We've confirmed your payment for order <strong>${n}</strong>. Your order is now being prepared.`,
  },
  PROCESSING: {
    heading: 'Order Being Prepared',
    message: (n) => `Your order <strong>${n}</strong> is now being processed and packed by the seller.`,
  },
  SHIPPING: {
    heading: 'Order Shipped',
    message: (n) => `Your order <strong>${n}</strong> is on its way!`,
  },
  DELIVERED: {
    heading: 'Order Delivered',
    message: (n) => `Your order <strong>${n}</strong> has been delivered. We hope you enjoy your purchase!`,
  },
  CANCELLED: {
    heading: 'Order Cancelled',
    message: (n) => `Your order <strong>${n}</strong> has been cancelled.`,
  },
};

export function getOrderStatusEmailHeading(status: string): string {
  return ORDER_STATUS_COPY[status]?.heading ?? 'Order Update';
}

export function orderStatusUpdateTemplate(params: {
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
  courier?: string | null;
  note?: string | null;
  items: { name: string; quantity: number; total: number }[];
  total: number;
}) {
  const copy = ORDER_STATUS_COPY[params.status];
  const message = copy
    ? copy.message(params.orderNumber)
    : `Your order <strong>${params.orderNumber}</strong> status has been updated to <strong>${params.status}</strong>.`;

  const details: string[] = [];
  if (params.status === 'SHIPPING' && params.trackingNumber) {
    details.push(
      `<p>Tracking number: <strong>${params.trackingNumber}</strong>${params.courier ? ` (${params.courier})` : ''}</p>`,
    );
  }
  if (params.note) {
    const label = params.status === 'CANCELLED' ? 'Reason' : 'Note';
    details.push(`<p>${label}: ${params.note}</p>`);
  }

  const rows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">${item.name} × ${item.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.total)}</td>
        </tr>`,
    )
    .join('');

  const body = `
    <p>Hi ${params.customerName},</p>
    <p>${message}</p>
    ${details.join('')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
      ${rows}
      <tr><td style="font-weight:bold;padding-top:6px;">Total</td><td style="font-weight:bold;padding-top:6px;text-align:right;">${money(params.total)}</td></tr>
    </table>`;

  return layout(copy?.heading ?? 'Order Update', body);
}

export function welcomeEmailTemplate(params: { customerName: string }) {
  const body = `
    <p>Hi ${params.customerName},</p>
    <p>Welcome to E-commerce Timor-Leste! Your account has been created successfully.
    Start exploring products from local sellers across Timor-Leste.</p>`;
  return layout('Welcome!', body);
}

// Generic wrapper for the in-app notification system (NotificationsService.
// sendNotification) — unlike the templates above, this isn't gated by an
// admin Settings toggle; each call site (e.g.
// sendProductBackInStockNotification) decides for itself whether to pass
// sendEmail: true. title/message are already human-readable text built by
// the caller, so this just reuses them rather than needing its own copy.
export function notificationEmailTemplate(params: {
  customerName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const button = params.actionUrl
    ? `<p style="margin-top:20px;">
         <a href="${params.actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">
           ${params.actionLabel || 'View Details'} &rarr;
         </a>
       </p>`
    : '';
  const body = `
    <p>Hi ${params.customerName},</p>
    <p>${params.message}</p>
    ${button}`;
  return layout(params.title, body);
}

export function abandonedCartTemplate(params: {
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  cartUrl: string;
}) {
  const rows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">${item.name} × ${item.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('');

  const body = `
    <p>Hi ${params.customerName},</p>
    <p>You left some items in your cart — they're still saved and waiting for you.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
      ${rows}
    </table>
    <p style="margin-top:20px;">
      <a href="${params.cartUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:bold;">
        Complete Your Order &rarr;
      </a>
    </p>`;

  return layout('Still thinking it over?', body);
}

export function testEmailTemplate() {
  const body = `<p>This is a test email confirming your SMTP settings are configured correctly.</p>`;
  return layout('Test Email', body);
}
