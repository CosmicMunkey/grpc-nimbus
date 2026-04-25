// Theme token names match the CSS custom properties defined in style.css.
export interface ThemeTokens {
  bg:      string; // main application background
  panel:   string; // sidebar / modal / panel background
  input:   string; // input field background
  hover:   string; // subtle hover state background
  border:  string; // borders and dividers
  text:    string; // primary text
  text2:   string; // secondary / muted text
  text3:   string; // dim text and inactive icons
  accent:  string; // primary accent (buttons, focus rings)
  accent2: string; // accent on hover / pressed
}

// CustomThemeEntry mirrors the Go struct exposed by Wails bindings.
export interface CustomThemeEntry {
  id: string;
  name: string;
  tokens: Partial<ThemeTokens>;
}

export type ThemeId = 'nimbus' | 'dark' | 'light' | 'deuteranopia' | 'tritanopia' | 'highcontrast' | 'custom';

// Built-in preset themes. 'custom' is handled separately via CustomThemeEntry list.
export const THEMES: Record<Exclude<ThemeId, 'custom'>, ThemeTokens> = {
  nimbus: {
    bg:      '#1a1a2e',
    panel:   '#16213e',
    input:   '#0d1117',
    hover:   '#1e2132',
    border:  '#2d3748',
    text:    '#e2e8f0',
    text2:   '#94a3b8',
    text3:   '#64748b',
    accent:  '#e94560',
    accent2: '#c73652',
  },
  dark: {
    bg:      '#282a36',
    panel:   '#21222c',
    input:   '#191a22',
    hover:   '#353746',
    border:  '#44475a',
    text:    '#f8f8f2',
    text2:   '#a0a8cd',
    text3:   '#6272a4',
    accent:  '#bd93f9',
    accent2: '#9a6fd8',
  },
  light: {
    bg:      '#f1f5f9',
    panel:   '#ffffff',
    input:   '#f8fafc',
    hover:   '#e2e8f0',
    border:  '#cbd5e1',
    text:    '#0f172a',
    text2:   '#334155',
    text3:   '#64748b',
    accent:  '#e94560',
    accent2: '#c73652',
  },
  // Deuteranopia-safe: avoids red/green distinction; uses blue accent.
  deuteranopia: {
    bg:      '#0d1117',
    panel:   '#161b22',
    input:   '#0b1021',
    hover:   '#1c2333',
    border:  '#30363d',
    text:    '#e6edf3',
    text2:   '#8b949e',
    text3:   '#636e7b',
    accent:  '#58a6ff',
    accent2: '#388bfd',
  },
  // Tritanopia-safe: avoids blue/yellow distinction; uses magenta accent.
  tritanopia: {
    bg:      '#1a1a1a',
    panel:   '#242424',
    input:   '#141414',
    hover:   '#2e2e2e',
    border:  '#404040',
    text:    '#f0f0f0',
    text2:   '#a0a0a0',
    text3:   '#737373',
    accent:  '#e040fb',
    accent2: '#c438d8',
  },
  // High contrast: maximum contrast for visibility across colorblindness types.
  highcontrast: {
    bg:      '#000000',
    panel:   '#111111',
    input:   '#0a0a0a',
    hover:   '#1e1e1e',
    border:  '#555555',
    text:    '#ffffff',
    text2:   '#cccccc',
    text3:   '#888888',
    accent:  '#ffdd00',
    accent2: '#e5c700',
  },
};

export const DEFAULT_CUSTOM_THEME: ThemeTokens = { ...THEMES.nimbus };

// Returns the ThemeTokens for a given preset id.
// For 'custom', pass the active custom theme's tokens merged over the default.
export function resolveTheme(id: ThemeId, customTokens?: Partial<ThemeTokens>): ThemeTokens {
  if (id === 'custom') return { ...DEFAULT_CUSTOM_THEME, ...customTokens };
  return THEMES[id];
}

// isBuiltinTheme returns true for non-custom theme IDs.
export function isBuiltinTheme(id: string): id is Exclude<ThemeId, 'custom'> {
  return id in THEMES;
}

// Sets the base font size by scaling the html root element.
// All Tailwind rem-based utilities (text-xs, text-sm, spacing, etc.)
// scale proportionally because rem is always relative to the html element.
export function applyFontSize(size: number): void {
  document.documentElement.style.fontSize = `${size}px`;
}

export const FONT_SIZE_PRESETS = [
  { label: 'XS',     value: 12 },
  { label: 'Small',  value: 14 },
  { label: 'Medium', value: 16 },
  { label: 'Large',  value: 18 },
  { label: 'XL',     value: 20 },
] as const;

// Writes CSS custom properties to :root and updates derived globals.
export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--c-bg',      tokens.bg);
  root.style.setProperty('--c-panel',   tokens.panel);
  root.style.setProperty('--c-input',   tokens.input);
  root.style.setProperty('--c-hover',   tokens.hover);
  root.style.setProperty('--c-border',  tokens.border);
  root.style.setProperty('--c-text',    tokens.text);
  root.style.setProperty('--c-text2',   tokens.text2);
  root.style.setProperty('--c-text3',   tokens.text3);
  root.style.setProperty('--c-accent',  tokens.accent);
  root.style.setProperty('--c-accent2', tokens.accent2);

  // Rebuild the select chevron SVG with the current text2 colour.
  const chevronColor = encodeURIComponent(tokens.text2);
  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${chevronColor}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;
  // Inject into a dynamic <style> tag so it overrides the static one in style.css.
  let dynStyle = document.getElementById('nimbus-theme-dynamic') as HTMLStyleElement | null;
  if (!dynStyle) {
    dynStyle = document.createElement('style');
    dynStyle.id = 'nimbus-theme-dynamic';
    document.head.appendChild(dynStyle);
  }

  // Determine color-scheme for form controls based on text luminance.
  const isDark = isColorDark(tokens.bg);
  dynStyle.textContent = `
    select { background-image: ${chevronSvg}; }
    input[type='number'] { color-scheme: ${isDark ? 'dark' : 'light'}; }
  `;
}

// Rough luminance check: returns true if the hex colour is dark.
export function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Perceived luminance (BT.709)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}
