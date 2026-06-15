'use client';

import { useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { fetchReport, useReportQuery } from '@/hooks/reports/useReportQuery';
import { parseApiError } from '@/lib/api-utils';
import { printReport } from '@/lib/print-report';
import {
  REPORT_DEFINITIONS,
  REPORT_OPTIONS,
  computeTotals,
  formatCell,
} from './report-config';
import type { ReportRow, ReportType } from '@/types/report';

const PAGE_SIZE = 25;
type DisplayRow = Record<string, unknown> & { _key: string; _total?: boolean };

function lastSevenDays() {
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start: toInput(start), end: toInput(end) };
}

export default function ReportsView() {
  const defaults = useMemo(lastSevenDays, []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [type, setType] = useState<ReportType>('summary');
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [page, setPage] = useState(1);
  const [printing, setPrinting] = useState(false);

  const def = REPORT_DEFINITIONS[type];

  // Reset to the first page whenever the report or range changes.
  useEffect(() => setPage(1), [type, startDate, endDate]);

  const query = useReportQuery({
    type,
    startDate,
    endDate,
    page,
    limit: PAGE_SIZE,
  });

  const response = query.data;
  const rows: ReportRow[] = useMemo(
    () => response?.rows ?? response?.data ?? [],
    [response],
  );
  const totals = useMemo(() => computeTotals(def, rows), [def, rows]);
  const firstTextKey = def.columns.find((c) => c.format === 'text')?.key;

  const displayRows: DisplayRow[] = useMemo(() => {
    const base: DisplayRow[] = rows.map((row, idx) => ({
      ...(row as unknown as Record<string, unknown>),
      _key: String(idx),
    }));
    if (totals && firstTextKey) {
      base.push({ ...totals, [firstTextKey]: 'Total', _key: '__totals__', _total: true });
    }
    return base;
  }, [rows, totals, firstTextKey]);

  const columns: Column<DisplayRow>[] = def.columns.map((col) => ({
    key: col.key,
    header: col.header,
    headerClassName: `p-4 font-semibold text-slate-500 uppercase tracking-widest text-[11px] ${
      col.align === 'right' ? 'text-right' : 'text-left'
    }`,
    className: `p-4 ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`,
    render: (row) => {
      const value = row[col.key];
      if (row._total && value === undefined) return '';
      return formatCell(value, col.format);
    },
  }));

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const full = await fetchReport({ type, startDate, endDate, all: true });
      const fullRows = full.rows ?? full.data ?? [];
      const subtitle = def.usesDateRange
        ? `Period: ${startDate} → ${endDate}`
        : 'Live snapshot (current stock)';
      const ok = printReport({
        title: `${def.label} Report`,
        subtitle,
        generatedAt: new Date().toLocaleString(),
        columns: def.columns,
        rows: fullRows,
        totals: computeTotals(def, fullRows),
        footnote: def.footnote,
      });
      if (!ok) toast.error('Popup blocked — allow popups to print the report.');
    } catch (error) {
      toast.error(parseApiError(error, 'Failed to prepare the report for printing'));
    } finally {
      setPrinting(false);
    }
  };

  const meta = response?.meta;
  const loading = query.isLoading || query.isFetching;

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-card flex flex-wrap items-end gap-3 p-5">
        <Select
          label="Report"
          className="min-w-[200px]"
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
          options={REPORT_OPTIONS}
        />
        {def.usesDateRange ? (
          <>
            <Input
              label="Start Date"
              type="date"
              max={endDate || today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              max={today}
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </>
        ) : null}
        <div className="ml-auto flex items-end gap-2">
          <Button
            variant="secondary"
            onClick={() => query.refetch()}
            isLoading={loading}
          >
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button onClick={handlePrint} isLoading={printing} disabled={loading}>
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <DataTable<DisplayRow>
          columns={columns}
          data={displayRows}
          loading={loading && !response}
          error={query.error ? parseApiError(query.error, 'Failed to load report') : null}
          onRetry={() => query.refetch()}
          rowKey={(row) => row._key}
          rowClassName={(row) =>
            row._total ? 'bg-slate-50 font-bold border-t-2 border-slate-200' : ''
          }
          empty="No data for the selected range."
        />
        {def.paginated && meta && meta.total > PAGE_SIZE ? (
          <TablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={PAGE_SIZE}
            shown={rows.length}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      {def.footnote ? (
        <p className="px-1 text-xs text-[var(--text-muted)]">{def.footnote}</p>
      ) : null}
    </div>
  );
}
