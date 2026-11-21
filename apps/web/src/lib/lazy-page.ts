import { lazy, type ComponentType } from "react";

// Each lazily loaded page registers its loader here so the prerender can resolve them all before rendering.
const loaders: (() => Promise<unknown>)[] = [];

/** Code-split a named export of a page module. */
export function lazyPage<K extends string>(loader: () => Promise<Record<K, ComponentType>>, key: K) {
  const load = () => loader().then((m) => ({ default: m[key] }));
  loaders.push(load);
  return lazy(load);
}

export function preloadLazyPages(): Promise<unknown[]> {
  return Promise.all(loaders.map((f) => f()));
}
