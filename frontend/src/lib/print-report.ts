import {
  formatCell,
  type ReportColumn,
} from '@/components/reports/report-config';
import type { ReportRow } from '@/types/report';

export interface PrintReportInput {
  title: string;
  subtitle: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: Record<string, number> | null;
  footnote?: string;
}

function esc(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(input: PrintReportInput): string {
  const headCells = input.columns
    .map(
      (c) =>
        `<th class="${c.align === 'right' ? 'r' : 'l'}">${esc(c.header)}</th>`,
    )
    .join('');

  const bodyRows = input.rows
    .map((row) => {
      const cells = input.columns
        .map((c) => {
          const value = (row as unknown as Record<string, unknown>)[c.key];
          return `<td class="${c.align === 'right' ? 'r' : 'l'}">${esc(
            formatCell(value, c.format),
          )}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const totalsRow = input.totals
    ? `<tr class="totals">${input.columns
        .map((c, idx) => {
          if (input.totals && c.key in input.totals) {
            return `<td class="${c.align === 'right' ? 'r' : 'l'}">${esc(
              formatCell(input.totals[c.key], c.format),
            )}</td>`;
          }
          return `<td class="${c.align === 'right' ? 'r' : 'l'}">${
            idx === 0 ? 'Total' : ''
          }</td>`;
        })
        .join('')}</tr>`
    : '';

  const footnote = input.footnote
    ? `<p class="footnote">${esc(input.footnote)}</p>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(input.title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; }
  header { margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 8px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
  th { text-transform: uppercase; font-size: 10px; letter-spacing: .05em; color: #444; background: #f4f4f4; }
  td.r, th.r { text-align: right; }
  td.l, th.l { text-align: left; }
  tr.totals td { font-weight: 700; border-top: 2px solid #111; background: #fafafa; }
  .footnote { margin-top: 12px; font-size: 10px; color: #777; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <header>
    <h1>${esc(input.title)}</h1>
    <div class="meta">${esc(input.subtitle)}</div>
    <div class="meta">Generated: ${esc(input.generatedAt)}</div>
  </header>
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${input.columns.length}">No data for the selected range.</td></tr>`}${totalsRow}</tbody>
  </table>
  ${footnote}
  <script>
    setTimeout(function () { window.focus(); window.print(); }, 50);
  </script>
</body>
</html>`;
}

export function printReport(input: PrintReportInput): boolean {
  const w = window.open('', '_blank', 'width=1024,height=720');
  if (!w) return false;
  w.document.write(buildHtml(input));
  w.document.close();
  return true;
}
