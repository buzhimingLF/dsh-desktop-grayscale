/**
 * Package-owned invariant companion for `@linxin666/dsh-client-ui-git-graph`.
 * Not mounted by the bundle patch (the web profile composes no invariants
 * service); kept as the repo-convention companion for compositions that do.
 * @module @linxin666/dsh-client-ui-git-graph/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis companion plugin name. */
export declare const name = "git-graph-invariant";
/** Service required before the companion can reserve package ownership. */
export declare const inject: string[];
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map