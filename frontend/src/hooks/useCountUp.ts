import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Rolls a number up to `target` (900ms, ease-out). Shows the final value immediately when reduced motion is preferred. */
export function useCountUp(target: number | null, duration = 900): number | null {
  const [val, setVal] = useState<number | null>(target);
  const from = useRef(0);
  useEffect(() => {
    if (target === null) { setVal(null); return; }
    if (prefersReducedMotion()) { setVal(target); from.current = target; return; }
    const start = performance.now(); const a = from.current; let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - p, 4);
      setVal(a + (target - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
