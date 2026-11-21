// @ts-nocheck
// Client production alias for "react": Preact compat plus the few React 19 hooks react-router imports.
import * as compat from "preact/compat";

export * from "preact/compat";
export default compat;

export function useOptimistic<T>(passthrough: T): [T, (action: unknown) => void] {
  return [passthrough, () => undefined];
}
