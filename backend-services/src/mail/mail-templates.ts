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

export function orderStatusUpdateTemplate(params: {
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
}) {
  const tracking = params.trackingNumber
    ? `<p>Tracking number: <strong>${params.trackingNumber}</strong></p>`
    : '';
  const body = `
    <p>Hi ${params.customerName},</p>
    <p>Your order <strong>${params.orderNumber}</strong> status has been updated to
    <strong>${params.status}</strong>.</p>
    ${tracking}`;
  return layout('Order Status Update', body);
}

export function welcomeEmailTemplate(params: { customerName: string }) {
  const body = `
    <p>Hi ${params.customerName},</p>
    <p>Welcome to E-commerce Timor-Leste! Your account has been created successfully.
    Start exploring products from local sellers across Timor-Leste.</p>`;
  return layout('Welcome!', body);
}

export function testEmailTemplate() {
  const body = `<p>This is a test email confirming your SMTP settings are configured correctly.</p>`;
  return layout('Test Email', body);
}
