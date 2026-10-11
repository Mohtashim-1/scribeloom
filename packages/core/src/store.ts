/**
 * A minimal observable value, shaped to plug into React's
 * `useSyncExternalStore` without depending on React.
 */
export interface Store<T> {
  getState: () => T;
  setState: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Creates a {@link Store} holding `initial`. */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
