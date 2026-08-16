/**
 * The git branch selector chip, mounted above the input card. Preferred
 * seat is the selector row's context hole
 * (`conversation.input.selector.context`, session-maybe) right beside the
 * official workspace selector; on shells that dropped the hole (rc.6 and the
 * current shipped shell) the chip falls back to `conversation.input.dock`
 * (session-scoped). On the dock's hero phase the chip joins the official
 * hero row after the agent-preset seat (right of the workspace and preset
 * chips), styled from the official `dsh-client-ui-theme` tokens; on the
 * active phase it measures the input card's left edge and aligns itself
 * flush with it. The chip hides itself only when its data source is absent
 * (no session cwd, or not a git repository).
 * @module dsh-git-graph/client/chips/BranchChip
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { GitGraphInjected } from '../index.ts';
/** Full props of the branch chip: either seat's runtime share (the session-maybe context hole or the session-scoped dock fallback) + the git-graph inject face + the locale seat. */
export type BranchChipProps = (PropsRuntime<'conversation.input.selector.context'> | PropsRuntime<'conversation.input.dock'>) & GitGraphInjected & PropsLocale<'git-graph'>;
/** Minimum gap between window-focus git refetches (ms). */
export declare const FOCUS_REFRESH_MIN_MS = 5000;
/**
 * The git branch selector chip.
 * @param props - the composed entry props of whichever seat it mounted in.
 */
export declare function BranchChip(props: BranchChipProps): import("react").JSX.Element | null;
//# sourceMappingURL=BranchChip.d.ts.map