/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff73',
          'green-glow': '#05f06f',
          'green-dark': '#00c853',
          'green-light': '#39ff8e',
        },
        dark: {
          bg: '#08080a',
          window: '#1e1f23',
          tabActive: '#121316',
          tabInactive: '#27282d',
          addressBar: '#141518',
          card: '#16171b',
          cardBorder: '#272930',
          panel: '#1a1b20',
          selected: '#2f3139',
          received: '#2b2d34',
          input: '#151619',
          muted: '#808594',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 255, 115, 0.45)',
        'neon-md': '0 0 20px rgba(0, 255, 115, 0.55)',
        'neon-lg': '0 0 30px rgba(0, 255, 115, 0.65)',
        'window': '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.15)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
      }
    },
  },
  plugins: [],
}
