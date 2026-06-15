'use client';

import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { REPORT_DEFINITIONS } from '@/components/reports/report-config';
import type { ReportResponse, ReportType } from '@/types/report';

// Reports run heavy SQL aggregation; give them a generous client timeout so a
// slow-but-valid query isn't cut off before the server's own statement timeout.
const REPORT_TIMEOUT_MS = 60_000;

interface ReportRequest {
  type: ReportType;
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
  all?: boolean;
}

function buildUrl({ type, startDate, endDate, page, limit, all }: ReportRequest) {
  const def = REPORT_DEFINITIONS[type];
  const params: Record<string, string | number | boolean> = {};
  if (def.usesDateRange) {
    params.startDate = startDate;
    params.endDate = endDate;
  }
  if (def.paginated) {
    if (all) params.all = true;
    else {
      params.page = page ?? 1;
      params.limit = limit ?? 25;
    }
  }
  return API_ENDPOINTS.reports[def.endpointKey](params);
}

/** One-shot fetch (used by the Print path with `all: true`). */
export async function fetchReport(req: ReportRequest): Promise<ReportResponse> {
  const res = await api.get<ReportResponse>(buildUrl(req), {
    timeout: REPORT_TIMEOUT_MS,
  });
  return res.data;
}

interface UseReportQueryArgs extends ReportRequest {
  enabled?: boolean;
}

export function useReportQuery({
  type,
  startDate,
  endDate,
  page,
  limit,
  enabled = true,
}: UseReportQueryArgs) {
  const showError = useErrorToast();
  const def = REPORT_DEFINITIONS[type];
  const rangeReady = !def.usesDateRange || (!!startDate && !!endDate);

  const query = useQuery<ReportResponse>({
    queryKey: ['reports', type, startDate, endDate, page, limit],
    enabled: enabled && rangeReady,
    placeholderData: keepPreviousData,
    queryFn: () => fetchReport({ type, startDate, endDate, page, limit }),
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load report');
  }, [query.error, showError]);

  return query;
}
