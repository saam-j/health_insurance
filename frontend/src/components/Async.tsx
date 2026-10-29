import type { ReactNode } from "react";
import type { ApiState } from "../hooks/useApi";
import { EmptyState, ErrorState, PageSkeleton } from "./ui";

/** Renders loading / error / empty states uniformly; children only render with valid, non-empty data. */
export function Async<T extends { empty?: boolean }>({ state, children }: { state: ApiState<T>; children: (data: T) => ReactNode }) {
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return <PageSkeleton />;
  if (state.data.empty) return <EmptyState />;
  return <div className={state.loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={state.loading}>{children(state.data)}</div>;
}
