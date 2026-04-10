/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme tokens — all values are driven by CSS custom properties so
        // the entire palette can be switched at runtime without a rebuild.
        'c-bg':      'var(--c-bg)',
        'c-panel':   'var(--c-panel)',
        'c-input':   'var(--c-input)',
        'c-hover':   'var(--c-hover)',
        'c-border':  'var(--c-border)',
        'c-text':    'var(--c-text)',
        'c-text2':   'var(--c-text2)',
        'c-text3':   'var(--c-text3)',
        'c-accent':  'var(--c-accent)',
        'c-accent2': 'var(--c-accent2)',
      },
    },
  },
  plugins: [],
}

