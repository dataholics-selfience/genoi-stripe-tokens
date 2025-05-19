/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sidebar': '#202123',
        'sidebar-hover': '#2A2B32',
        'chat-bg': '#343541',
        'user-bg': '#343541',
        'assistant-bg': '#444654',
        'border': '#4E4F60',
        'button': '#202123',
        'button-hover': '#2A2B32',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        }
      }
    },
  },
  plugins: [],
};