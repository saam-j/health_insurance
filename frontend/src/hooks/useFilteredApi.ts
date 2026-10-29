import { filterParams } from "../services/api";
import { useApi } from "./useApi";
import { useFilters } from "./useFilters";

/** useApi + the global dashboard filters, so every page re-queries when a filter changes. */
export function useFilteredApi<T>(path: string, extra: Record<string, string | number | undefined | null> = {}) {
  const { filters } = useFilters();
  return useApi<T>(path, { ...filterParams(filters), ...extra });
}
