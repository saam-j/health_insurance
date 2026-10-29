import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** 480px side drawer over a 55% scrim (Design Spec 5.8). Closes on Esc, scrim click or the close button. */
export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-xl" style={{ animation: "drawer-in 320ms cubic-bezier(0.22,1,0.36,1) both" }}>
        <header className="flex items-start justify-between gap-3 border-b border-hairline p-5">
          <div><h2 className="font-display text-lg font-medium">{title}</h2>{subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}</div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline hover:bg-muted"><X size={16} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        <footer className="border-t border-hairline p-4"><button onClick={onClose} className="h-10 w-full rounded-xl border border-hairline text-sm font-medium hover:bg-muted">Close</button></footer>
      </aside>
    </div>
  );
}
