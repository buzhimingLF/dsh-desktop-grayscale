/**
 * Git-graph surface plugin, browser half: the git branch selector chip,
 * docked above the input card. Preferred seat is the input selector row's
 * context hole (`conversation.input.selector.context`, a session-maybe
 * list slot declared and rendered by newer shipped ui-conversation shells),
 * right beside the official workspace selector; the published npm SDK
 * (rc.6) and the current shipped shell dropped that hole, so the chip waits
 * on its declaration for {@link CONTEXT_FALLBACK_MS} and then falls back to
 * `conversation.input.dock` (the 0.1.9 seat). On the dock, BranchChip
 * indents by the shell's composer side clearance so it starts flush with
 * the input card below it in the active phase; in the hero (blank-session)
 * phase it lifts itself into the official hero chip row, immediately after
 * the agent-preset seat, so the branch chip sits right of the preset name.
 * All git facts arrive through the host /git routes (this package's own host
 * half); the inject face carries the business verbs, the components stay
 * pure props.
 *
 * The context hole is session-maybe: the chip stays mounted from cold start
 * through the active phase and hides itself when its data source is absent
 * (no session cwd, or not a git repository) — no workspace selector lives
 * here, the official selector chip docked above the input card owns that
 * surface. The dock fallback is session-scoped: the chip mounts once a
 * session is active and renders on the dock's own row above the composer
 * card, left-aligned with the input card. Revision 0be6546 moved the chip
 * back to the context hole without a fallback, so on rc.6 shells the inject
 * wait never resolved and the chip disappeared. The published npm SDK (rc.6)
 * dropped the hole's type, so it is spelled locally below.
 * @module dsh-git-graph/client
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { BranchesView, GraphView, RepoStatus, SwitchResult } from '../core/types.ts';
import { type GitGraphKey } from './locales.ts';
export type { GitGraphKey } from './locales.ts';
export { BranchChip } from './chips/BranchChip.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The git-graph chip copy. */
        'git-graph': GitGraphKey;
    }
    interface SlotMap {
        /**
         * The input selector context-chip hole: feature chips rendered right
         * after the workspace selector (the git branch selector's seat).
         * Session-maybe: entries stay mounted without a session and hide
         * themselves when their data source is absent.
         *
         * Declared and rendered by the running dsh web shell
         * (ui-conversation's InputSelectorRow); the published npm SDK (rc.6)
         * dropped this hole, so it is spelled locally to keep the chip's
         * registration type-checked without depending on the sibling SDK surface.
         */
        'conversation.input.selector.context': {
            kind: 'list';
            scope: 'session-maybe';
            owner: InputSelectorContextOwnerProps;
        };
    }
}
/** Owner share of the input selector context-chip hole (empty by contract). */
export interface InputSelectorContextOwnerProps {
}
/** Required services: slots for the selector-context entry, sessions for the cwd lookup, locale for the copy. */
export declare const inject: string[];
/** Injected business face of the branch chip: git verbs, keyed by the current session id. */
export interface GitGraphInjected {
    /** The workspace repository snapshot; null when not a repository. */
    repoStatus: (sessionId: SessionId | undefined) => Promise<RepoStatus | null>;
    /** Local branch list with the current branch marked. */
    branches: (sessionId: SessionId | undefined) => Promise<BranchesView | null>;
    /** Workspace-level `git switch --no-guess <branch>`. */
    switchBranch: (sessionId: SessionId | undefined, branch: string) => Promise<SwitchResult>;
    /** `git switch --no-guess -c <name>` from the current HEAD. */
    createBranch: (sessionId: SessionId | undefined, name: string) => Promise<SwitchResult>;
    /** Topo-ordered commit graph. */
    graph: (sessionId: SessionId | undefined, limit?: number) => Promise<GraphView | null>;
    /** Host-pushed branch-state changes for the session's workspace. */
    subscribeChanges: (sessionId: SessionId | undefined, onChange: () => void) => () => void;
}
/**
 * How long the chip waits for the selector-context declaration before
 * falling back to the input dock. The window covers the shell's first
 * render of the input selector row after the conversation service is up;
 * shells that never declare the hole (rc.6) land on the dock after it.
 */
export declare const CONTEXT_FALLBACK_MS = 2000;
/**
 * Client plugin body: the branch chip entry with its git verbs, on the
 * selector-context hole with an input-dock fallback.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map