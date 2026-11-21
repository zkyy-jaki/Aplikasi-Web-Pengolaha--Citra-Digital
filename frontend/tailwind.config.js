/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F3ECEF',
        panel: '#FFF8FA',
        panelHeader: '#FFF8FA',
        panelBorder: '#EBD5DD',
        subtleBg: '#FCEAF0',
        textPrimary: '#2B1F24',
        mutedText: '#7A636C',
        accent: '#C85A7C',
        accentHover: '#B3486A',
        accentLight: '#FCEAF0',
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(43, 31, 36, 0.05)',
      },
    },
  },
  plugins: [],
}
