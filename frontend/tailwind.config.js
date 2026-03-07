/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bruno-like dark palette
        'bg-primary':   '#1a1a2e',
        'bg-secondary': '#16213e',
        'bg-tertiary':  '#0f3460',
        'accent':       '#e94560',
        'accent-hover': '#c73652',
        'text-primary': '#e2e8f0',
        'text-muted':   '#94a3b8',
        'border':       '#2d3748',
        'surface':      '#1e2132',
        'surface-hover':'#262b40',
      },
    },
  },
  plugins: [],
}

