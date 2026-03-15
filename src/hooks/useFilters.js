import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useFilters — shared filter state with URL persistence + predictable reset.
 *
 * @param {Object} schema — { key: defaultValue } pairs
 * @param {Object} options — { persist: true/false } to enable URL sync
 * @returns {{ filters, set, reset, activeCount, isFiltered }}
 *
 * Usage:
 *   const { filters, set, reset, activeCount } = useFilters({
 *     search: "", squad: "", phase: "", owner: "",
 *   }, { persist: true });
 *
 *   set.search("foo");
 *   set.squad("Consumer");
 *   reset(); // clears all + URL params
 */
export default function useFilters(schema, options = {}) {
  const { persist = false } = options;
  const defaults = useRef(schema);

  // Init from URL params if persist enabled
  const initValues = useRef(() => {
    const values = { ...schema };
    if (persist && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      Object.keys(schema).forEach(key => {
        const urlVal = params.get(key);
        if (urlVal !== null) values[key] = urlVal;
      });
    }
    return values;
  });

  const [filters, setFilters] = useState(() => initValues.current());

  // Per-key setters
  const setters = useRef({});
  Object.keys(schema).forEach(key => {
    if (!setters.current[key]) {
      setters.current[key] = (val) => setFilters(prev => ({ ...prev, [key]: val }));
    }
  });

  // Reset all to defaults + clear URL
  const reset = useCallback(() => {
    setFilters({ ...defaults.current });
  }, []);

  // Count of active (non-default) filters
  const activeCount = Object.keys(schema).reduce((count, key) => {
    return count + (filters[key] !== defaults.current[key] && filters[key] !== "" && filters[key] !== null ? 1 : 0);
  }, 0);

  // Sync to URL if persist enabled
  useEffect(() => {
    if (!persist) return;
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== defaults.current[key]) p.set(key, val);
    });
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [filters, persist]);

  return {
    filters,
    set: setters.current,
    reset,
    activeCount,
    isFiltered: activeCount > 0,
  };
}
