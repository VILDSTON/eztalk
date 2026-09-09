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
          base: '#050505',      // Глубокий нейтральный чёрный фон
          surface: '#0B0B0C',   // Сайдбар и панели (угольный)
          elevated: '#121214',  // Карточки, модалки, списки
          border: '#1E1E22',    // Рамки и разделители без синевы
          hover: '#18181B',     // Нейтральный ховер
          accent: '#10B981',    // Твой фирменный изумруд
          glow: '#00FF66',
          muted: '#71717A',     // Нейтральный пепельный текст
          sent: '#064E3B',      // Отправленные сообщения
          received: '#141417',  // Полученные сообщения (тёмный графит)
          input: '#0E0E11',     // Поле ввода
          overlay: '#050505',
        },
        neon: {
          green: '#10B981',
          'green-glow': '#00FF66',
          'green-dark': '#059669',
          'green-light': '#34D399',
        },
        dark: {
          bg: '#050505',
          window: '#121214',
          tabActive: '#0B0B0C',
          tabInactive: '#18181B',
          addressBar: '#0E0E11',
          card: '#121214',
          cardBorder: '#1E1E22',
          panel: '#0B0B0C',
          selected: '#18181B',
          received: '#141417',
          input: '#0E0E11',
          muted: '#71717A',
        }
      },
      borderRadius: {
        'sm': '1px',
        DEFAULT: '2px',
        'md': '3px',
        'lg': '4px',
        'xl': '5px',
        '2xl': '6px',
        '3xl': '8px',
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
        'glass': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'window': '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
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
        flashHighlight: {
          '0%': { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.2s ease-out forwards',
        'scale-up': 'scaleUp 0.2s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'dot-bounce': 'dotBounce 1.4s ease-in-out infinite',
        'flash-highlight': 'flashHighlight 1.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}