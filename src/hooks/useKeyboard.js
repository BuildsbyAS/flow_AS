import { useEffect } from "react";

/**
 * useKeyboard — lightweight global keyboard shortcut hook.
 *
 * @param {Array<{key:string, fn:Function, force?:boolean, shift?:boolean, ctrl?:boolean, meta?:boolean}>} bindings
 *   - key   : e.key value to match (e.g. "ArrowUp", "Escape", "1", "l")
 *   - fn    : handler called when key matches
 *   - force : if true, fires even when focus is inside input/textarea/select
 *   - shift / ctrl / meta : require modifier
 * @param {Array} deps — dependency array (same as useEffect)
 */
export default function useKeyboard(bindings, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;

      for (const b of bindings) {
        const keyMatch = e.key === b.key || e.key === b.key?.toLowerCase();
        if (!keyMatch) continue;
        if (b.shift && !e.shiftKey) continue;
        if (b.ctrl && !e.ctrlKey) continue;
        if (b.meta && !e.metaKey) continue;
        if (inInput && !b.force) continue;

        e.preventDefault();
        b.fn(e);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
