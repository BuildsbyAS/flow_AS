import { useEffect, useState } from "react";

// Keeps a component mounted through its exit animation.
// Returns { mounted, visible }:
//   mounted — render the component (true while open OR during exit window)
//   visible — drive enter/exit animation choice (true on open, false during exit)
export default function useExitAnimation(open, exitMs = 250) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    const reduced = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveExit = reduced ? 0 : exitMs;
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), effectiveExit);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted, visible };
}
