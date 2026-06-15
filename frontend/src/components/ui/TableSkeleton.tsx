'use client';

interface TableSkeletonProps {
  cols: number;
  rows?: number;
}

export default function TableSkeleton({ cols, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="bg-white">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <td key={colIndex} className="p-5">
              <div className="skeleton h-5 w-24 rounded-lg bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
