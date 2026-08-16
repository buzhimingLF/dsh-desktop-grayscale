/**
 * Composer dock inlay: the drop target for explorer file drags. It mounts
 * in the official `conversation.input.dock` band (a session-scoped list
 * slot declared by the shipped ui-conversation rc.6 shell), so it stacks
 * with the git-graph chip above the composer card. While a file row is
 * dragged over the page it shows a hint strip; on drop it splices the
 * workspace-relative path into the active session's draft through the
 * conversation input facade.
 *
 * The document-level listeners only claim drags carrying our custom MIME —
 * the composer host's own drop handling (OS image files) is untouched. The
 * host's `dragover` refuses every drop it does not claim, so this inlay
 * must `preventDefault` its own drags to make the drop land.
 * @module dsh-aionui-panel/client/drag/DragFileInlay
 */
import { type ReactElement } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Injected business face of the drag inlay (session-routed). */
export interface DragFileInjected {
    /** Splice a workspace-relative path into the active session's draft. */
    insertPath: (path: string) => boolean;
}
/** Composed props: the dock's runtime share (sessionId) + the injected verb. */
export type DragFileInlayProps = PropsRuntime<'conversation.input.dock'> & DragFileInjected;
/**
 * The composer dock entry: a zero-height anchor that shows a hint strip
 * while a file row is dragged over the page and inserts the path on drop.
 * @param props - the composed dock entry props.
 */
export declare function DragFileInlay(props: DragFileInlayProps): ReactElement;
//# sourceMappingURL=DragFileInlay.d.ts.map