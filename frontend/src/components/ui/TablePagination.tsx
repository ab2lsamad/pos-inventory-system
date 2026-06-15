'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  shown?: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  shown,
  onPageChange,
}: TablePaginationProps) {
  const displayedCount = shown ?? Math.min(pageSize, total);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-white">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        Showing {displayedCount} of {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} /> Previous
        </Button>
        <span className="text-sm font-semibold text-slate-600 px-2">
          {page} / {safeTotalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={page >= safeTotalPages}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
