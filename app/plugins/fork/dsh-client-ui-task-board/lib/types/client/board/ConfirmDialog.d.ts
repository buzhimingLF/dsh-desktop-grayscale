/** Confirm overlay props. */
export interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    /** Render the confirm button in the danger style. */
    danger?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}
/** Small confirm overlay. */
export declare function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }: ConfirmDialogProps): import("react").JSX.Element;
