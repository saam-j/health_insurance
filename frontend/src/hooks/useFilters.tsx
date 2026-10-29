import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Filters } from "../types/api";

interface Ctx { filters: Filters; setFilter: (k: keyof Filters, v: string | undefined) => void; reset: () => void; active: number }
const FilterCtx = createContext<Ctx | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>({});
  const value = useMemo<Ctx>(() => ({
    filters,
    setFilter: (k, v) => setFilters((f) => ({ ...f, [k]: v || undefined })),
    reset: () => setFilters({}),
    active: Object.values(filters).filter(Boolean).length,
  }), [filters]);
  return <FilterCtx.Provider value={value}>{children}</FilterCtx.Provider>;
}

export function useFilters() {
  const c = useContext(FilterCtx);
  if (!c) throw new Error("useFilters must be used inside FilterProvider");
  return c;
}
