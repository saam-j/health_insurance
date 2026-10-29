import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export function Card({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card enter ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-medium">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = "teal" | "red" | "grey" | "ink";
const tones: Record<Tone, string> = { teal: "bg-teal-tint text-teal-deep", red: "bg-accent-tint text-accent", grey: "bg-muted text-ink-muted", ink: "bg-ink text-white" };
export function Chip({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}
export const statusTone = (s: string): Tone => (s === "High cost" || s === "Pending" ? "red" : s === "Cost-efficient" || s === "Processed" ? "teal" : "grey");

/** Marks values that come from simulated (not source-file) fields, per the Design Spec data caveat. */
export function SimulatedTag() {
  return <span title="Derived from simulated data: the public dataset has no such field" className="ml-1.5 inline-block rounded-full bg-muted px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-ink-muted">Simulated</span>;
}

export function Skeleton({ className = "h-40" }: { className?: string }) { return <div className={`skel ${className}`} aria-hidden />; }
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      <div className="grid gap-3 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-2 py-10 text-center">
      <AlertTriangle className="text-accent" size={28} />
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="max-w-md text-xs text-ink-muted">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white active:scale-[0.97]"><RefreshCw size={14} />Try again</button>}
    </div>
  );
}
export function EmptyState({ message = "No policies match the current filters." }: { message?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="text-ink-muted" size={28} />
      <p className="text-sm font-medium">No data to show</p>
      <p className="text-xs text-ink-muted">{message} Try clearing a filter.</p>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
      <p className="text-sm text-ink-muted">{subtitle}</p>
    </div>
  );
}
