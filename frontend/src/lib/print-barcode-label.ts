import JsBarcode from 'jsbarcode';
import { format } from './money';

export interface BarcodeLabel {
  barcode: string;
  productName: string;
  variantName?: string;
  price: string;
  sku: string;
  // Currency code (e.g. "PKR", "USD") used to format the price. When omitted
  // the raw price string is printed.
  currency?: string;
}

function formatPrice(label: BarcodeLabel): string {
  if (!label.currency) return label.price;
  try {
    return format(label.currency, label.price);
  } catch {
    return `${label.currency} ${label.price}`;
  }
}

function esc(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a barcode as standalone SVG markup. Uses EAN-13 for valid 13-digit
 * codes, otherwise falls back to CODE128 so legacy/manual barcodes still print.
 */
function renderBarcodeSvg(code: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const isEan13 = /^\d{13}$/.test(code);
  const opts = {
    width: 1.4,
    height: 34,
    fontSize: 11,
    margin: 0,
    displayValue: true,
  };
  try {
    JsBarcode(svg, code, { format: isEan13 ? 'EAN13' : 'CODE128', ...opts });
  } catch {
    // Last-resort fallback: CODE128 accepts virtually any ASCII string.
    JsBarcode(svg, code, { format: 'CODE128', ...opts });
  }
  return svg.outerHTML;
}

function buildLabel(label: BarcodeLabel, isLast: boolean): string {
  const title = label.variantName
    ? `${label.productName} — ${label.variantName}`
    : label.productName;
  const priceText = formatPrice(label);
  return `
    <div class="label" style="${isLast ? '' : 'page-break-after: always;'}">
      <div class="pname">${esc(title)}</div>
      <div class="barcode">${renderBarcodeSvg(label.barcode)}</div>
      <div class="row">
        <span class="price">${esc(priceText)}</span>
        <span class="sku">${esc(label.sku)}</span>
      </div>
    </div>
  `;
}

function buildHtml(labels: BarcodeLabel[]): string {
  const body = labels
    .map((l, i) => buildLabel(l, i === labels.length - 1))
    .join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Barcode Labels</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; color: #000; background: #fff; }
      .label {
        width: 50mm;
        height: 25mm;
        padding: 1mm 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5mm;
        overflow: hidden;
      }
      .pname {
        width: 100%;
        text-align: center;
        font-size: 7pt;
        font-weight: 700;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .barcode { width: 100%; text-align: center; }
      .barcode svg { max-width: 100%; height: auto; }
      .row {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 7pt;
        gap: 2mm;
      }
      .price { font-weight: 700; }
      .sku { font-family: ui-monospace, Menlo, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      @media print {
        @page { size: 50mm 25mm; margin: 0; }
        body { width: 50mm; }
      }
    </style>
  </head>
  <body>
    ${body}
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () { window.focus(); window.print(); }, 50);
      });
      window.addEventListener('afterprint', function () { window.close(); });
    </script>
  </body>
</html>`;
}

/**
 * Open a print window with one 50 × 25 mm barcode sticker per label.
 * Returns false if a window could not be opened or there is nothing to print.
 */
export function printBarcodeLabels(labels: BarcodeLabel[]): boolean {
  if (typeof window === 'undefined') return false;
  const printable = labels.filter((l) => l.barcode && l.barcode.trim());
  if (printable.length === 0) return false;
  const w = window.open('', '_blank', 'width=420,height=320');
  if (!w) return false;
  w.document.open();
  w.document.write(buildHtml(printable));
  w.document.close();
  return true;
}
