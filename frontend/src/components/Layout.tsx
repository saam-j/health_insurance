import { Activity, BarChart3, Database, Lightbulb, LayoutDashboard, Search, Users, Layers, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { Meta } from "../types/api";
import { FilterBar } from "./FilterBar";
import { HatchDefs } from "./charts";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/claims", label: "Claims", icon: Activity },
  { to: "/policyholders", label: "Policyholders", icon: Users },
  { to: "/plans", label: "Plans", icon: Layers },
  { to: "/policies", label: "Policy drill-down", icon: BarChart3 },
  { to: "/insights", label: "Insights", icon: Lightbulb },
];

export function Layout({ children }: { children: ReactNode }) {
  const { data: meta } = useApi<Meta>("/api/meta", {});
  const nav = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box (the keyboard hint shown in the input).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="min-h-full p-2 sm:p-4">
      <HatchDefs />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] gap-3 rounded-frame border-[6px] border-white bg-canvas p-3 shadow-card">
        <aside className="card flex w-14 shrink-0 flex-col gap-4 !p-2 lg:w-60 lg:!p-4" aria-label="Primary">
          <div className="hidden rounded-2xl bg-muted p-3 lg:block">
            <p className="eyebrow">Portfolio</p>
            <p className="mt-1 text-sm font-medium">Health Insurance Portfolio</p>
            <p className="mt-1 text-[11px] text-ink-muted">{meta ? `${meta.policies.toLocaleString()} policies · ${meta.is_synthetic ? "synthetic demo data" : "source file"}` : "Loading…"}</p>
          </div>
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-teal-deep text-white lg:hidden"><Database size={16} /></span>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={label}
                className={({ isActive }) => `flex h-10 items-center justify-center gap-3 rounded-full px-3 text-[13px] font-medium transition-colors duration-200 lg:justify-start ${isActive ? "bg-teal-deep text-white" : "text-ink hover:bg-muted"}`}>
                <Icon size={17} strokeWidth={1.5} /><span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <p className="mt-auto hidden text-[11px] leading-snug text-ink-muted lg:block">Plan, premium and claim timing fields are simulated. See Insights for data notes.</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="card flex items-center gap-3 !py-3">
            <form className="relative flex-1" role="search" onSubmit={(e) => { e.preventDefault(); const v = searchRef.current?.value.trim(); if (v) nav(`/policies?q=${encodeURIComponent(v)}`); }}>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input ref={searchRef} aria-label="Search policy ID" placeholder="Search policy ID, e.g. P-0042" maxLength={20}
                className="h-10 w-full rounded-xl border border-hairline bg-muted pl-9 pr-10 text-sm placeholder:text-ink-muted" />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-hairline bg-white px-1.5 text-[10px] text-ink-muted">/</kbd>
            </form>
          </header>
          <FilterBar />
          <main id="main" className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
