/**
 * Staged form model behind the plugin settings card. A card stages what the
 * user types and writes it only when they save — the settings write is a
 * durable, revision-fenced document mutation, so staging keeps what is on
 * screen exactly what a save would store. Family-shared slice inlined into
 * each plugin's client bundle; mirrors the official ui-plugin-config
 * card-store pattern.
 */
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** The write one field's staged text performs when the card is saved. */
export type FieldWrite = {
    kind: 'set';
    value: unknown;
} | {
    kind: 'clear';
};
/** How one field converts between its stored value and its draft text. */
export interface FieldSpec {
    /** Field name inside the namespace section. */
    field: string;
    /**
     * Whether the Host treats this field as a secret and redacts its value from
     * the read-back (role('secret') in the section schema). Redacted secrets are
     * never compared against the draft on save; the field lands when the scope
     * reports the write succeeded (its secret-set marker under the bridge), so
     * a successful secret save is not misreported as failed.
     */
    secret?: boolean;
    /** Render a stored value as draft text; the empty string when the section carries none. */
    format: (value: unknown) => string;
    /**
     * The write this draft text stages, or undefined when the text is not a
     * value this field accepts — which blocks the save rather than discarding it.
     */
    parse: (text: string) => FieldWrite | undefined;
}
/** One field as the card renders it. */
export interface FieldState {
    /** Draft text the control renders. */
    text: string;
    /** Whether saving would leave a user-layer entry for this field. */
    overridden: boolean;
    /** Whether the draft is not a value this field accepts, which blocks saving. */
    invalid: boolean;
}
/** Form state every plugin settings card shares. */
export interface CardShell {
    /** False while the namespace is still loading; the card renders nothing. */
    available: boolean;
    /**
     * Whether the namespace is actually served to this client. False when the
     * Host deployment does not expose it (e.g. the official apiproxy settings
     * allowlist omits third-party namespaces): the card renders an explanation
     * instead of its form, so a missing namespace never looks like a missing
     * plugin.
     */
    exposed: boolean;
    /** Whether the Host document accepts writes. */
    writable: boolean;
    /** Whether the form holds edits that a save would write. */
    dirty: boolean;
    /** Whether any staged draft is invalid, which blocks the save. */
    invalid: boolean;
    /** Whether a save is crossing the wire. */
    saving: boolean;
    /** Whether the last save did not land as staged; cleared by the next edit or save. */
    failed: boolean;
    /**
     * The rejection code/message the Host returned for the last failed save,
     * surfaced next to the generic failure text. Undefined while no save has
     * failed (or the failure carried no server reason).
     */
    failedReason?: string;
}
/** The write actions the card's slot entry injects. */
export interface CardActions {
    /** Stage draft text for one field. */
    edit: (field: string, text: string) => void;
    /** Stage a clear, so saving lets the field re-inherit the composition layer. */
    resetField: (field: string) => void;
    /** Write every staged edit, then re-seed from what the Host accepted. */
    save: () => void;
    /** Drop every staged edit. */
    discard: () => void;
}
/** One durable write a batched settings scope performs. */
export interface BatchedWrite {
    /** Field this entry writes. */
    field: string;
    /** set stores a value; unset drops the leaf. */
    op: 'set' | 'unset';
    /** Value for op set (absent for unset). */
    value?: unknown;
}
/** Per-field outcome of one batched scope write. */
export interface BatchedFieldResult {
    /** Field this entry writes. */
    field: string;
    /** Whether the Host accepted this field's write (per the read-back view). */
    landed: boolean;
}
/**
 * Result of a batched scope write. The bridge scope posts every planned write
 * in one /mutate so the Host validate hook judges baseURL+model together; a
 * batched refusal fails the whole save rather than per-field.
 */
export interface BatchResult {
    /** Whether the whole mutate was accepted. */
    ok: boolean;
    /** Per-field success, in the request order (always present when ok). */
    fields: BatchedFieldResult[];
    /** Host rejection code (mutate refused). */
    code?: string;
    /** Host rejection message (mutate refused). */
    message?: string;
}
/** Constraints a numeric field's accepted drafts must satisfy, mirroring the host schema. */
export interface NumberConstraints {
    /** The accepted value must be a whole number. */
    integer?: boolean;
    /** The accepted value must be at least this. */
    min?: number;
}
/** A whole- or decimal-number field. An empty draft clears the field; any other draft that is not a finite number within the constraints blocks the save. */
export declare function numberField(field: string, constraints?: NumberConstraints): FieldSpec;
/** A free-text field. An empty draft clears the field. */
export declare function textField(field: string): FieldSpec;
/**
 * A free-text field the Host treats as a secret and redacts from the read-back
 * (role('secret') in the section schema). The card still edits it like text,
 * but a save never compares the redacted value back and relies on the scope
 * reporting the write landed.
 */
export declare function secretField(field: string): FieldSpec;
/** A boolean field, edited through true/false draft text. */
export declare function booleanField(field: string): FieldSpec;
/** An enumerated string field; only the listed choices are accepted. An empty draft clears the field. */
export declare function choiceField(field: string, choices: readonly string[]): FieldSpec;
/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The Host is the only authority on whether a value was accepted — its
 * validators own the constraints no schema can express — so the outcome is
 * read back from the section rather than predicted here. A save that did not
 * land keeps its drafts, so the user can correct them instead of retyping.
 */
export declare class CardForm<T> {
    private readonly scope;
    private readonly specs;
    private readonly staged;
    private readonly listeners;
    private saving;
    private failed;
    private failedReason;
    /** @param scope - the bound settings scope for this card's namespace. */
    constructor(scope: SettingsScope<T>, specs: FieldSpec[]);
    /** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
    bind<S>(project: () => S): SnapshotStore<S>;
    /** Read the card-level state: what the Host serves, and what a save would do. */
    shell(): CardShell;
    /** Read one field's state from the effective section and its staged draft. */
    field(field: string): FieldState;
    /** The actions the card's slot registration injects. */
    actions(): CardActions;
    /**
     * Write every staged edit, then re-seed from what the Host accepted.
     *
     * When the scope carries the optional batch surface (the dsh-web-ui
     * bridge scope), every planned write rides one mutation so cross-field
     * validate hooks (baseURL+model) judge the batch as a unit instead of
     * deadlocking on per-field writes. Otherwise the per-field loop runs.
     * A field lands only when the Host reports it held the staged value; a
     * landed field's draft is dropped, a failed one stays staged for the user.
     * @returns settlement after every write and the read-back.
     */
    save(): Promise<void>;
    /** The scope's batch surface when it supports one; undefined conservatively otherwise. */
    private batchedScope;
    /**
     * Every staged edit a save would write. An entry whose draft is not a value
     * its field accepts carries no write: the form is still dirty, and the save
     * refuses rather than dropping the edit. A staged edit that matches the
     * effective section is not a write at all.
     * @returns the planned writes, in the order the fields were staged.
     */
    private plan;
    private clear;
    private store;
    private stage;
    private specOf;
    private snapshotOf;
    private sectionValue;
    private baseValue;
    private userLayer;
    private stored;
    private publish;
}
