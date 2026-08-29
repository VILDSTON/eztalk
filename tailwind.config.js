/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ez: {
          base: '#0B0E14',
          surface: '#12161F',
          elevated: '#1A1F2C',
          border: '#242A38',
          hover: '#2A3142',
          accent: '#10B981',
          glow: '#00FF66',
          muted: '#64748B',
          sent: '#0D3B2E',
          received: '#1E2230',
          input: '#151A24',
          overlay: '#0B0E14',
        },
        neon: {
          green: '#10B981',
          'green-glow': '#00FF66',
          'green-dark': '#059669',
          'green-light': '#34D399',
        },
        dark: {
          bg: '#0B0E14',
          window: '#1A1F2C',
          tabActive: '#12161F',
          tabInactive: '#242A38',
          addressBar: '#151A24',
          card: '#1A1F2C',
          cardBorder: '#242A38',
          panel: '#12161F',
          selected: '#2A3142',
          received: '#1E2230',
          input: '#151A24',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(16, 185, 129, 0.35)',
        'neon-md': '0 0 20px rgba(16, 185, 129, 0.45)',
        'neon-lg': '0 0 30px rgba(16, 185, 129, 0.55)',
        'neon-glow': '0 0 15px rgba(0, 255, 102, 0.5)',
        'neon-dot': '0 0 8px rgba(0, 255, 102, 0.6)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'window': '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
        dotBounce: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.2s ease-out forwards',
        'scale-up': 'scaleUp 0.2s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'dot-bounce': 'dotBounce 1.4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
