/**
 * The Changes (SCM) panel: per-repo working-tree status grouped into staged /
 * unstaged / untracked, with stage/unstage/discard actions on every row and
 * bulk actions in the section header. The host status is the only truth — no
 * optimistic rows; a failed batch surfaces its paths and the next refresh
 * clears the flag. Discard confirms with copy split by recoverability
 * (untracked = delete vs tracked = irreversible restore).
 *
 * AionUi ScmPanel behavior (Apache-2.0, re-implemented): window focus
 * refreshes (external editors write without git events), unknown states
 * render as a quiet '?', conflicted rows are visually distinct AND have no
 * actions.
 * @module dsh-aionui-panel/client/components/ScmPanel
 */
import type { JSX } from 'react';
import type { PanelStores } from '../store.ts';
/** The SCM tab body.
 * @param stores - the panel store bundle.
 */
export declare function ScmPanel({ stores }: {
    stores: PanelStores;
}): JSX.Element;
//# sourceMappingURL=ScmPanel.d.ts.map