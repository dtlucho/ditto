/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dt: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          text: '#e6edf3',
          muted: '#8b949e',
          accent: '#58a6ff',
          green: '#3fb950',
          orange: '#d29922',
          red: '#f85149',
        },
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Fira Code'", 'monospace'],
      },
    },
  },
  plugins: [],
}
