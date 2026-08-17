/**
 * CodeMirror 6 theme pieces for the sidebar editor. The editor surface
 * (background, caret, gutter) rides the DSH theme tokens so it blends with
 * the panel in both schemes; only the syntax token colors need concrete
 * values, and those come from the same designed palettes the app's code
 * surfaces use — the one-dark family for dark, the one-light family for
 * light. The scheme flip reconfigures these via a compartment (see
 * TextEditor), so the document, undo history and scroll survive re-theming.
 */
import { Compartment } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags, type Tag } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'

/** Token-driven surface shared by both schemes (pure CSS values). */
export const cmSurfaceTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: 'var(--dsw-alias-label-primary)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--ds-font-family-code)',
  },
  '.cm-content': {
    caretColor: 'var(--dsw-alias-label-primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--dsw-alias-label-tertiary)',
    border: 'none',
  },
})

/** Scheme-specific surface tints (selection, active line). */
function cmSurfaceTint(dark: boolean): ReturnType<typeof EditorView.theme> {
  return EditorView.theme({
    '.cm-selectionBackground, .cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
  })
}

/** One syntax rule: a tag (or tag set) mapped to a concrete color/style. */
interface HighlightRule {
  tag: Tag | readonly Tag[]
  color?: string
  fontStyle?: string
}

/** one-dark syntax palette → 极简灰度（按亮度梯度区分语法，去掉彩色）。 */
const HIGHLIGHTS_DARK: HighlightRule[] = [
  { tag: tags.comment, color: '#6a6a6a', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#c8c8c8' },
  { tag: tags.string, color: '#a8a8a8' },
  { tag: tags.number, color: '#989898' },
  { tag: tags.bool, color: '#989898' },
  { tag: tags.atom, color: '#989898' },
  { tag: tags.typeName, color: '#b0b0b0' },
  { tag: tags.className, color: '#b0b0b0' },
  { tag: tags.propertyName, color: '#a0a0a0' },
  { tag: tags.function(tags.variableName), color: '#c8c8c8' },
  { tag: tags.variableName, color: '#a0a0a0' },
  { tag: tags.operator, color: '#888888' },
  { tag: tags.tagName, color: '#b8b8b8' },
  { tag: tags.attributeName, color: '#989898' },
  { tag: tags.heading, color: '#d8d8d8', fontStyle: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontStyle: 'bold' },
  { tag: tags.link, color: '#a8a8a8', fontStyle: 'underline' },
  { tag: tags.meta, color: '#b0b0b0' },
  { tag: tags.invalid, color: '#ffffff', fontStyle: 'bold' },
]

/** one-light syntax palette → 极简灰度（按亮度梯度区分语法，去掉彩色）。 */
const HIGHLIGHTS_LIGHT: HighlightRule[] = [
  { tag: tags.comment, color: '#9a9a9a', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#2a2a2a' },
  { tag: tags.string, color: '#4a4a4a' },
  { tag: tags.number, color: '#3a3a3a' },
  { tag: tags.bool, color: '#3a3a3a' },
  { tag: tags.atom, color: '#3a3a3a' },
  { tag: tags.typeName, color: '#333333' },
  { tag: tags.className, color: '#333333' },
  { tag: tags.propertyName, color: '#3d3d3d' },
  { tag: tags.function(tags.variableName), color: '#2a2a2a' },
  { tag: tags.variableName, color: '#3d3d3d' },
  { tag: tags.operator, color: '#555555' },
  { tag: tags.tagName, color: '#383838' },
  { tag: tags.attributeName, color: '#3a3a3a' },
  { tag: tags.heading, color: '#1e1e1e', fontStyle: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontStyle: 'bold' },
  { tag: tags.link, color: '#4a4a4a', fontStyle: 'underline' },
  { tag: tags.meta, color: '#333333' },
  { tag: tags.invalid, color: '#111111', fontStyle: 'bold' },
]

/** The scheme-dependent extension pair (surface tint + syntax highlight). */
function cmThemeExtensions(dark: boolean): Array<ReturnType<typeof EditorView.theme>> {
  return [
    cmSurfaceTint(dark),
    syntaxHighlighting(HighlightStyle.define(dark ? HIGHLIGHTS_DARK : HIGHLIGHTS_LIGHT)),
  ]
}

/**
 * A Compartment holding the two scheme-dependent extensions. Created once
 * per editor view; a scheme flip dispatches `reconfigure(dark)` on it, so
 * the document, undo history, scroll and keymaps survive re-theming.
 */
export class CmThemeCompartment {
  private readonly compartment = new Compartment()

  /** `of(...)` payload for EditorState.create. */
  of(dark: boolean): ReturnType<Compartment['of']> {
    return this.compartment.of(cmThemeExtensions(dark))
  }

  /** Reconfigure for a new scheme. */
  reconfigure(dark: boolean): ReturnType<Compartment['reconfigure']> {
    return this.compartment.reconfigure(cmThemeExtensions(dark))
  }
}
