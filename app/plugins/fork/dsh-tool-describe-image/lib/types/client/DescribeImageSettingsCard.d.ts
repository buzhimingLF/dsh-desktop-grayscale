/**
 * The describe-image settings card: the vision endpoint (base URL, model,
 * key reference), the default instruction, and the call bounds. Registers
 * into the `web-ui.plugin.item` slot the Web UI Plugins group renders,
 * bound to the `describe-image` settings namespace through the family
 * settings bridge (or the official settings scope when the deployment
 * exposes the namespace directly).
 * @module @linxin666/dsh-tool-describe-image/client/DescribeImageSettingsCard
 */
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import { type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts';
/** The describe-image fields this card edits (the namespace's full schema). */
export interface DescribeImageSettings {
    baseURL?: string;
    model?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    defaultPrompt?: string;
    maxBytes?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
    apiStyle?: 'chat-completions' | 'responses';
    renderImagePreview?: boolean;
}
/** What the describe-image card renders. */
export interface DescribeImageSettingsCardState extends CardShell {
    baseURL: CardFieldState;
    model: CardFieldState;
    apiKey: CardFieldState;
    apiKeyEnv: CardFieldState;
    defaultPrompt: CardFieldState;
    maxBytes: CardFieldState;
    maxOutputTokens: CardFieldState;
    timeoutMs: CardFieldState;
    apiStyle: CardFieldState;
    renderImagePreview: CardFieldState;
}
/** The registration-side face the card's slot entry injects. */
export interface DescribeImageSettingsCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as useDescribeImageSettingsCard. */
        describeImageSettingsCard: SnapshotStore<DescribeImageSettingsCardState>;
    };
}
/** Bridges the `describe-image` scope onto the card's staged form. */
export declare class DescribeImageSettingsCardController {
    private readonly form;
    private readonly store;
    /** @param scope - the bound settings scope for the `describe-image` namespace. */
    constructor(scope: SettingsScope<DescribeImageSettings>);
    private projection;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): DescribeImageSettingsCardFace;
}
/** Props the renderer binds for the describe-image card. */
export type DescribeImageSettingsCardProps = PropsRuntime<'web-ui.plugin.item'> & InjectFace<DescribeImageSettingsCardFace>;
/**
 * Render the describe-image card.
 * @param props - the card snapshot and its form actions.
 * @returns the card.
 */
export declare function DescribeImageSettingsCard(props: DescribeImageSettingsCardProps): import("react").JSX.Element;
//# sourceMappingURL=DescribeImageSettingsCard.d.ts.map