import type { Config } from 'tailwindcss';

/**
 * Lumen design tokens live in `src/app/globals.css` as CSS custom properties and
 * are surfaced to Tailwind here. Components must reference these token names —
 * never raw hex values (see Section 1 of the product spec).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        raised: 'var(--surface-raised)',
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          ink: 'var(--accent-ink)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        hairline: 'var(--border-subtle)',
      },
      borderColor: {
        DEFAULT: 'var(--border-subtle)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        pill: '999px',
        card: '16px',
        window: '14px',
      },
      maxWidth: {
        shell: '1180px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
