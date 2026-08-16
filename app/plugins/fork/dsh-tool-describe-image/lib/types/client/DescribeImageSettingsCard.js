import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PluginSettingsCard, BooleanField, ChoiceField, ValueField } from "./PluginSettingsCard.js";
import { CardForm, booleanField, choiceField, numberField, secretField, textField } from "./settings-form.js";
import { t } from "./locales.js";
/** Bridges the `describe-image` scope onto the card's staged form. */
export class DescribeImageSettingsCardController {
    form;
    store;
    /** @param scope - the bound settings scope for the `describe-image` namespace. */
    constructor(scope) {
        this.form = new CardForm(scope, [
            textField('baseURL'),
            textField('model'),
            choiceField('apiStyle', ['chat-completions', 'responses']),
            secretField('apiKey'),
            textField('apiKeyEnv'),
            textField('defaultPrompt'),
            numberField('maxBytes'),
            numberField('maxOutputTokens'),
            numberField('timeoutMs'),
            booleanField('renderImagePreview'),
        ]);
        this.store = this.form.bind(() => this.projection());
    }
    projection() {
        return {
            ...this.form.shell(),
            baseURL: this.form.field('baseURL'),
            model: this.form.field('model'),
            apiStyle: this.form.field('apiStyle'),
            apiKey: this.form.field('apiKey'),
            apiKeyEnv: this.form.field('apiKeyEnv'),
            defaultPrompt: this.form.field('defaultPrompt'),
            maxBytes: this.form.field('maxBytes'),
            maxOutputTokens: this.form.field('maxOutputTokens'),
            timeoutMs: this.form.field('timeoutMs'),
            renderImagePreview: this.form.field('renderImagePreview'),
        };
    }
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject() {
        return { hooks: { describeImageSettingsCard: this.store }, ...this.form.actions() };
    }
}
/**
 * Render the describe-image card.
 * @param props - the card snapshot and its form actions.
 * @returns the card.
 */
export function DescribeImageSettingsCard(props) {
    const state = props.useDescribeImageSettingsCard(snapshot => snapshot);
    const disabled = !state.writable;
    const fieldProps = {
        overriddenLabel: t('settings.overridden'),
        resetLabel: t('settings.reset'),
        invalidLabel: t('settings.invalidNumber'),
        disabled,
    };
    return (_jsxs(PluginSettingsCard, { t: t, titleKey: "card.title", descriptionKey: "card.description", state: state, onSave: props.save, onDiscard: props.discard, children: [_jsx(ValueField, { id: "settings-describe-image-baseurl", label: t('field.baseURL'), hint: t('field.baseURL.hint'), placeholder: "https://api.example.com/v1", ...fieldProps, ...state.baseURL, onEdit: (text) => { props.edit('baseURL', text); }, onReset: () => { props.resetField('baseURL'); } }), _jsx(ValueField, { id: "settings-describe-image-model", label: t('field.model'), hint: t('field.model.hint'), ...fieldProps, ...state.model, onEdit: (text) => { props.edit('model', text); }, onReset: () => { props.resetField('model'); } }), _jsx(ChoiceField, { id: "settings-describe-image-apistyle", label: t('field.apiStyle'), hint: t('field.apiStyle.hint'), inheritLabel: t('settings.inherit'), choices: [
                    { value: 'chat-completions', label: t('field.apiStyle.chatCompletions') },
                    { value: 'responses', label: t('field.apiStyle.responses') },
                ], ...fieldProps, ...state.apiStyle, onEdit: (text) => { props.edit('apiStyle', text); }, onReset: () => { props.resetField('apiStyle'); } }), _jsx(ValueField, { id: "settings-describe-image-apikey", label: t('field.apiKey'), hint: t('field.apiKey.hint'), ...fieldProps, ...state.apiKey, onEdit: (text) => { props.edit('apiKey', text); }, onReset: () => { props.resetField('apiKey'); } }), _jsx(ValueField, { id: "settings-describe-image-apikeyenv", label: t('field.apiKeyEnv'), hint: t('field.apiKeyEnv.hint'), ...fieldProps, ...state.apiKeyEnv, onEdit: (text) => { props.edit('apiKeyEnv', text); }, onReset: () => { props.resetField('apiKeyEnv'); } }), _jsx(ValueField, { id: "settings-describe-image-defaultprompt", label: t('field.defaultPrompt'), hint: t('field.defaultPrompt.hint'), ...fieldProps, ...state.defaultPrompt, onEdit: (text) => { props.edit('defaultPrompt', text); }, onReset: () => { props.resetField('defaultPrompt'); } }), _jsx(ValueField, { id: "settings-describe-image-maxbytes", label: t('field.maxBytes'), hint: t('field.maxBytes.hint'), numeric: true, ...fieldProps, ...state.maxBytes, onEdit: (text) => { props.edit('maxBytes', text); }, onReset: () => { props.resetField('maxBytes'); } }), _jsx(ValueField, { id: "settings-describe-image-maxoutputtokens", label: t('field.maxOutputTokens'), hint: t('field.maxOutputTokens.hint'), numeric: true, ...fieldProps, ...state.maxOutputTokens, onEdit: (text) => { props.edit('maxOutputTokens', text); }, onReset: () => { props.resetField('maxOutputTokens'); } }), _jsx(ValueField, { id: "settings-describe-image-timeoutms", label: t('field.timeoutMs'), hint: t('field.timeoutMs.hint'), numeric: true, ...fieldProps, ...state.timeoutMs, onEdit: (text) => { props.edit('timeoutMs', text); }, onReset: () => { props.resetField('timeoutMs'); } }), _jsx(BooleanField, { id: "settings-describe-image-render-preview", label: t('field.renderImagePreview'), hint: t('field.renderImagePreview.hint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.renderImagePreview, onEdit: (text) => { props.edit('renderImagePreview', text); }, onReset: () => { props.resetField('renderImagePreview'); } })] }));
}
