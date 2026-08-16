/**
 * React bindings for the framework-free stores: useSyncExternalStore with a
 * stable snapshot (the stores return immutable snapshots, so selector-free
 * subscription is safe), plus a stable-callback helper for event handlers.
 * @module dsh-aionui-panel/client/hooks/useStore
 */
import type { StateHandle } from '../store.ts';
/** Subscribe a component to one store (full snapshot). */
export declare function useStore<S>(store: StateHandle<S>): S;
/** A callback whose identity never changes but always reads fresh values. */
export declare function useLatest<T extends (...args: never[]) => unknown>(fn: T): T;
//# sourceMappingURL=useStore.d.ts.map