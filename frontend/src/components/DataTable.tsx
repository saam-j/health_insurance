import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; align?: "right"; sortKey?: string }
interface Props<T> {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; selectedKey?: string | null;
  sort?: { by: string; order: "asc" | "desc" }; onSort?: (key: string) => void; caption: string; compact?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, sort, onSort, caption, compact }: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-[13px] ${compact ? "" : "min-w-[560px]"}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => {
              const active = sort && c.sortKey === sort.by;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort!.order === "asc" ? "ascending" : "descending") : undefined} className={`eyebrow whitespace-nowrap px-3 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  {c.sortKey && onSort ? (
                    <button onClick={() => onSort(c.sortKey!)} className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-ink">
                      {c.header}{active && (sort!.order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const k = rowKey(r); const sel = selectedKey === k;
            return (
              <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(r); } } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={`h-12 border-b border-hairline transition-colors duration-150 last:border-0 ${onRowClick ? "cursor-pointer" : ""} ${sel ? "bg-teal-tint shadow-[inset_3px_0_0_#00ABB4]" : "hover:bg-muted"}`}>
                {columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{c.render(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const btn = "rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium disabled:opacity-40 enabled:hover:bg-muted";
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
      <span>{total.toLocaleString()} rows · page {page} of {pages}</span>
      <span className="flex gap-2"><button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></span>
    </div>
  );
}
