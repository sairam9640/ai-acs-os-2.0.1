import React from 'react';

export interface Column<T> {
  header: React.ReactNode;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full py-8 text-center text-[#64748B] text-sm animate-pulse bg-white border border-[#E2E8F0] rounded-[10px]">
        Loading records...
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-[#E2E8F0] rounded-[10px] bg-white shadow-xs">
      <table className="w-full text-left text-sm text-[#334155]">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569] uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F7]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#94A3B8]">
                No matching records found.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`hover:bg-[#F8FAFC] transition ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-3 text-[#334155] ${col.className || ''}`}>
                    {typeof col.accessor === 'function'
                      ? col.accessor(item)
                      : col.accessor
                      ? (item[col.accessor] as any)
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
