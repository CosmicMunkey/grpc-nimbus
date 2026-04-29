import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';
import type { ThemeTokens } from './themes';
import { isColorDark } from './themes';

function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((ch) => `${ch}${ch}`).join('');
  }
  if (clean.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Builds a CodeMirror Extension[] that mirrors the app's active ThemeTokens.
// Both the editor chrome and JSON syntax colors derive from the same token
// palette so every built-in and custom theme is respected automatically.
export function buildCodeMirrorTheme(tokens: ThemeTokens): Extension[] {
  const isDark = isColorDark(tokens.bg);

  const editorTheme = EditorView.theme(
    {
      '&': {
        color: tokens.text,
        backgroundColor: tokens.bg,
      },
      '.cm-content': {
        caretColor: tokens.accent,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: tokens.accent,
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: hexToRgba(tokens.accent, 0.22),
      },
      '.cm-gutters': {
        backgroundColor: tokens.panel,
        color: tokens.text3,
        border: 'none',
        borderRight: `1px solid ${tokens.border}`,
      },
      '.cm-gutterElement': {
        color: tokens.text3,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        color: tokens.text3,
      },
      '.cm-activeLineGutter': {
        backgroundColor: tokens.hover,
        color: tokens.text2,
      },
      '.cm-activeLine': {
        backgroundColor: hexToRgba(tokens.hover, 0.5),
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: hexToRgba(tokens.accent, 0.18),
        outline: `1px solid ${hexToRgba(tokens.accent, 0.4)}`,
      },
      '.cm-foldPlaceholder': {
        color: tokens.text3,
        backgroundColor: tokens.hover,
        border: `1px solid ${tokens.border}`,
      },
      '.cm-tooltip': {
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.panel,
        color: tokens.text,
      },
      '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: tokens.hover,
        color: tokens.text,
      },
      '.cm-panels': {
        backgroundColor: tokens.panel,
        color: tokens.text,
        borderTop: `1px solid ${tokens.border}`,
        borderBottom: `1px solid ${tokens.border}`,
      },
      '.cm-searchMatch': {
        backgroundColor: hexToRgba(tokens.accent, 0.2),
        outline: `1px solid ${hexToRgba(tokens.accent, 0.5)}`,
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: hexToRgba(tokens.accent, 0.35),
      },
    },
    { dark: isDark }
  );

  // Syntax colors derived entirely from the token palette so they are always
  // safe for the selected colorblind-aware theme.
  const highlightStyle = HighlightStyle.define([
    // String values use the primary accent — already chosen to be safe per theme
    // (blue for deuteranopia, magenta for tritanopia, yellow for high-contrast).
    { tag: tags.string, color: tokens.accent },
    // Property names (object keys) get an italic style cue in addition to color.
    { tag: tags.propertyName, color: tokens.text, fontStyle: 'italic' },
    // Numbers use secondary text — distinct but not relying on hue.
    { tag: tags.number, color: tokens.text2 },
    // Keywords (true, false, null) use the accent hover shade.
    { tag: [tags.bool, tags.null], color: tokens.accent2, fontWeight: 'bold' },
    // Punctuation and brackets are dimmed structural chrome.
    { tag: [tags.punctuation, tags.bracket, tags.squareBracket, tags.brace], color: tokens.text3 },
    { tag: tags.comment, color: tokens.text3, fontStyle: 'italic' },
  ]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
}
