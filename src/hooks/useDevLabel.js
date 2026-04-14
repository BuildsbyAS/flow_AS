// useDevLabel — registers a component for the DevOverlay system
// In production: zero overhead, returns a plain ref
// In dev: attaches data-dev-* attributes for overlay discovery
import { useRef, useEffect, useContext, useCallback } from "react";

// Registry lives outside React so it survives re-renders
const registry = new Set();
const listeners = new Set();

export function getRegistry() { return registry; }
export function subscribeRegistry(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notifyRegistry() { listeners.forEach(fn => fn()); }

const IS_DEV = import.meta.env.DEV;

export default function useDevLabel(name, filePath, description) {
  const ref = useRef(null);

  useEffect(() => {
    if (!IS_DEV) return;
    const el = ref.current;
    if (!el) return;

    // Attach data attributes
    el.setAttribute("data-dev-name", name);
    el.setAttribute("data-dev-file", filePath);
    if (description) el.setAttribute("data-dev-desc", description);

    // Register entry
    const entry = { name, filePath, description, el };
    registry.add(entry);
    notifyRegistry();

    return () => {
      registry.delete(entry);
      notifyRegistry();
    };
  }, [name, filePath, description]);

  return ref;
}
