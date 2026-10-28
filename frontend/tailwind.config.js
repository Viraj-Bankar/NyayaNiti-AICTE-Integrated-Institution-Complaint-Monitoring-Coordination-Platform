/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#092D62',
          darkNavy: '#061E46',
          blue: '#1E5AA8',
          amber: '#FFB900',
          amberDark: '#D49B00',
          lightGray: '#F4F6F9',
          borderGray: '#E2E8F0',
          muted: '#66788A',
          teal: '#25B8BD',
          success: '#218653',
          critical: '#C62828',
          card: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        '3d-btn': '0 4px 0 0 #061E46, 0 6px 12px rgba(9, 45, 98, 0.25)',
        '3d-btn-amber': '0 4px 0 0 #B8860B, 0 6px 12px rgba(255, 185, 0, 0.35)',
        '3d-btn-white': '0 3px 0 0 #CBD5E1, 0 4px 8px rgba(0, 0, 0, 0.08)',
        'gov-card': '0 2px 8px -2px rgba(9, 45, 98, 0.08), 0 1px 4px -1px rgba(9, 45, 98, 0.04)',
      }
    },
  },
  plugins: [],
}
