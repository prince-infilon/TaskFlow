/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: 'var(--color-bg-canvas)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          muted: 'var(--color-bg-surface-muted)',
        },
        inset: 'var(--color-bg-inset)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
        'on-accent': 'var(--color-text-on-accent)',
        
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
        },
        success: {
          50: 'var(--color-success-50)',
          500: 'var(--color-success-500)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          500: 'var(--color-warning-500)',
        },
        danger: {
          50: 'var(--color-danger-50)',
          500: 'var(--color-danger-500)',
        },
        info: {
          50: 'var(--color-info-50)',
          500: 'var(--color-info-500)',
        },
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', fontWeight: '600' }],
        h1: ['22px', { lineHeight: '30px', fontWeight: '600' }],
        h2: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        small: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        drag: '0 8px 20px rgba(15, 23, 42, 0.12)',
      }
    },
  },
  plugins: [],
}
