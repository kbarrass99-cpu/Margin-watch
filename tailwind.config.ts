import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // The one accent colour. Used for primary actions and focus only;
        // good/bad states use emerald/red so they never compete with it.
        accent: {
          DEFAULT: '#2348d8',
          hover: '#1c3bb5',
          soft: '#eef1fc',
        },
      },
      keyframes: {
        shimmer: { to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
