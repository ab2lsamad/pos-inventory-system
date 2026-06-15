import { format, toNumber } from './money';
import { DiscountType, PaymentMethod } from '@/types/shared';
import type { CartLine, CartLineDiscount } from '@/types/pos';
import type { Customer } from '@/types/customer';

export interface ReceiptSnapshot {
  receiptNumber: string | number;
  orderId: string;
  createdAt: string;
  currency: string;
  storeName?: string;
  storeLocation?: string;
  storePhone?: string;
  cashierName?: string;
  salespersonName?: string;
  customer?: Customer | null;
  paymentMethod: PaymentMethod;
  items: CartLine[];
  orderDiscounts: CartLineDiscount[];
  subtotal: string;
  totalLineDiscount: string;
  totalTax: string;
  totalOrderDiscount: string;
  grandTotal: string;
  amountPaid: string;
  changeGiven: string;
  // Optional notice rendered above the footer (e.g. "Exchange items are
  // final sale"). Plain text — newlines become <br>.
  footerNotice?: string;
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.DEBIT_CARD]: 'Card',
  [PaymentMethod.MOBILE_WALLET]: 'Mobile Wallet',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.OTHER]: 'Other',
};

function esc(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDiscountLabel(d: CartLineDiscount): string {
  return d.type === DiscountType.PERCENTAGE ? `${d.value}%` : `−${d.value}`;
}

function buildHtml(s: ReceiptSnapshot): string {
  const dt = new Date(s.createdAt);
  const dateStr = dt.toLocaleString();

  const itemRows = s.items
    .map((item) => {
      const lineDiscounts = item.discounts
        .map(
          (d) =>
            `<div class="sub">↳ ${esc(d.name)} (${esc(fmtDiscountLabel(d))})</div>`,
        )
        .join('');
      const tax =
        item.taxRatePercent !== '0'
          ? `<div class="sub">+ tax ${esc(item.taxRatePercent)}% = ${esc(
              format(s.currency, item.runningTotals.lineTax),
            )}</div>`
          : '';
      return `
        <tr>
          <td>
            <div class="name">${esc(item.productName)} — ${esc(item.variantName)}</div>
            <div class="sub mono">${esc(item.sku)}</div>
            ${lineDiscounts}
            ${tax}
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${esc(toNumber(item.unitPrice).toFixed(2))}</td>
          <td class="num">${esc(toNumber(item.runningTotals.lineNet).toFixed(2))}</td>
        </tr>
      `;
    })
    .join('');

  const orderDiscountRows = s.orderDiscounts.length
    ? `<div class="order-discounts">
         ${s.orderDiscounts
           .map(
             (d) =>
               `<div class="row"><span>${esc(d.name)} (${esc(
                 fmtDiscountLabel(d),
               )})</span></div>`,
           )
           .join('')}
       </div>`
    : '';

  const customerRow = s.customer
    ? `<div class="meta-row"><span>Customer</span><span>${esc(s.customer.fullName)}</span></div>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt #${esc(s.receiptNumber)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #000;
        background: #fff;
        padding: 12px;
        font-size: 12px;
        line-height: 1.45;
      }
      .receipt { max-width: 320px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 8px; }
      .header h1 { font-size: 16px; margin: 0 0 2px; letter-spacing: 0.5px; }
      .header .small { font-size: 11px; color: #444; }
      .divider { border-top: 1px dashed #999; margin: 8px 0; }
      .meta-row { display: flex; justify-content: space-between; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 2px; vertical-align: top; }
      th { text-align: left; font-size: 10px; color: #555; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.5px; }
      th.num, td.num { text-align: right; white-space: nowrap; padding-left: 10px; font-size: 11px; font-variant-numeric: tabular-nums; }
      td { border-bottom: 1px dotted #ccc; }
      .name { font-weight: 600; }
      .sub { font-size: 10px; color: #555; }
      .mono { font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.5px; }
      .totals { margin-top: 6px; }
      .totals .row { display: flex; justify-content: space-between; font-size: 12px; padding: 1px 0; }
      .totals .grand { font-weight: 800; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
      .order-discounts { margin-top: 4px; }
      .order-discounts .row { display: flex; justify-content: space-between; font-size: 11px; color: #444; }
      .footer { text-align: center; margin-top: 10px; font-size: 11px; color: #444; }
      .notice {
        margin-top: 8px;
        padding: 4px 6px;
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        color: #92400e;
        background: #fef3c7;
        border: 1px dashed #d97706;
        border-radius: 4px;
      }
      @media print {
        @page { margin: 5mm; }
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="header">
        <h1>${esc(s.storeName || 'Store')}</h1>
        ${s.storeLocation ? `<div class="small">${esc(s.storeLocation)}</div>` : ''}
        ${s.storePhone ? `<div class="small">${esc(s.storePhone)}</div>` : ''}
      </div>

      <div class="meta-row"><span>Receipt #</span><span>${esc(s.receiptNumber)}</span></div>
      <div class="meta-row"><span>Date</span><span>${esc(dateStr)}</span></div>
      ${s.cashierName ? `<div class="meta-row"><span>Cashier</span><span>${esc(s.cashierName)}</span></div>` : ''}
      ${s.salespersonName ? `<div class="meta-row"><span>Salesperson</span><span>${esc(s.salespersonName)}</span></div>` : ''}
      ${customerRow}

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${esc(format(s.currency, s.subtotal))}</span></div>
        ${
          parseFloat(s.totalLineDiscount) > 0
            ? `<div class="row"><span>Line discounts</span><span>−${esc(
                format(s.currency, s.totalLineDiscount),
              )}</span></div>`
            : ''
        }
        <div class="row"><span>Tax</span><span>${esc(format(s.currency, s.totalTax))}</span></div>
        ${
          parseFloat(s.totalOrderDiscount) > 0
            ? `<div class="row"><span>Order discount</span><span>−${esc(
                format(s.currency, s.totalOrderDiscount),
              )}</span></div>${orderDiscountRows}`
            : ''
        }
        <div class="row grand"><span>Grand Total</span><span>${esc(format(s.currency, s.grandTotal))}</span></div>
      </div>

      <div class="divider"></div>

      <div class="meta-row"><span>Payment</span><span>${esc(PAYMENT_LABEL[s.paymentMethod])}</span></div>
      <div class="meta-row"><span>Amount Paid</span><span>${esc(format(s.currency, s.amountPaid))}</span></div>
      <div class="meta-row"><span>Change</span><span>${esc(format(s.currency, s.changeGiven))}</span></div>

      ${
        s.footerNotice
          ? `<div class="notice">${esc(s.footerNotice).replace(/\n/g, '<br>')}</div>`
          : ''
      }

      <div class="footer">
        <div>Thank you for your purchase!</div>
        <div class="mono">${esc(s.orderId)}</div>
      </div>
    </div>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () { window.focus(); window.print(); }, 50);
      });
      window.addEventListener('afterprint', function () { window.close(); });
    </script>
  </body>
</html>`;
}

export function printReceipt(snapshot: ReceiptSnapshot): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return false;
  w.document.open();
  w.document.write(buildHtml(snapshot));
  w.document.close();
  return true;
}
