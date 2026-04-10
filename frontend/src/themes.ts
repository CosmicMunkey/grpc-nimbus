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

export type ThemeId = 'nimbus' | 'dark' | 'light' | 'custom';

export const THEMES: Record<Exclude<ThemeId, 'custom'>, ThemeTokens> = {
  nimbus: {
    bg:      '#1a1a2e',
    panel:   '#16213e',
    input:   '#0d1117',
    hover:   '#1e2132',
    border:  '#2d3748',
    text:    '#e2e8f0',
    text2:   '#94a3b8',
    text3:   '#4a5568',
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
    text:    '#1e293b',
    text2:   '#475569',
    text3:   '#94a3b8',
    accent:  '#e94560',
    accent2: '#c73652',
  },
};

export const DEFAULT_CUSTOM_THEME: ThemeTokens = { ...THEMES.nimbus };

// Returns the ThemeTokens for a given id + optional custom overrides.
export function resolveTheme(id: ThemeId, custom?: Partial<ThemeTokens>): ThemeTokens {
  if (id === 'custom') return { ...DEFAULT_CUSTOM_THEME, ...custom };
  return THEMES[id];
}

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
function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Perceived luminance (BT.709)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}
