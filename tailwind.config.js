const withOpacityValue = (variable) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: withOpacityValue('--color-background'),
        surface: withOpacityValue('--color-surface'),
        surfaceMuted: withOpacityValue('--color-surface-muted'),
        foreground: withOpacityValue('--color-foreground'),
        muted: withOpacityValue('--color-muted'),
        brand: {
          DEFAULT: '#6C5DD3',
          50: '#f5f3ff',
          100: '#ece9ff',
          200: '#d8d3ff',
          300: '#beb0ff',
          400: '#9a80ff',
          500: '#7f5fff',
          600: '#6c5dd3',
          700: '#584bb0',
          800: '#463d8d',
          900: '#372f6f',
        },
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
    boxShadow: {
      none: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
      '2xl': 'none',
      inner: 'none',
      outline: 'none',
      soft: 'none',
    },
  },
  plugins: [],
};
