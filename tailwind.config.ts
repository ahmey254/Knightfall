import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#070912',
          soft: '#0d1020',
          card: '#11142a',
        },
        accent: {
          DEFAULT: '#7c5cff',
          hot: '#ff4d8d',
          cyan: '#22d3ee',
          lime: '#a3e635',
        },
        muted: '#8a90b3',
        ring: '#23284a',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse at top, rgba(124,92,255,0.15), transparent 60%), radial-gradient(ellipse at bottom, rgba(34,211,238,0.10), transparent 60%)',
        'hero-glow':
          'conic-gradient(from 180deg at 50% 50%, #7c5cff 0deg, #22d3ee 120deg, #ff4d8d 240deg, #7c5cff 360deg)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(124, 92, 255, 0.35)',
        'glow-cyan': '0 0 30px rgba(34, 211, 238, 0.35)',
        card: '0 10px 40px -10px rgba(8, 8, 24, 0.8)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        check: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,77,141,0.6)' },
          '50%': { boxShadow: '0 0 0 14px rgba(255,77,141,0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        check: 'check 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
