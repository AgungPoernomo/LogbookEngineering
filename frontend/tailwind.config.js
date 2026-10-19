/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          soft: '#DBE7FB',
          'text-on-soft': '#3B6FD8'
        },
        app: '#F3F5F9',
        surface: '#FFFFFF',
        muted: '#F7F8FB',
        line: '#E6E9F0',
        ink: {
          DEFAULT: '#111827',
          2: '#6B7280',
          3: '#9CA3AF'
        },
        success: '#22A55B',
        warning: '#EAB308',
        violet: '#5B4BDB',
        orange: '#F97316',
        danger: '#EF4444',
        'row-blue': '#EAF1FD',
        'row-red': '#FDECEC',
        status: {
          draft:     { bg: '#F3F4F6', fg: '#4B5563', dot: '#9CA3AF' },
          pending:   { bg: '#FEF3C7', fg: '#B45309', dot: '#EAB308' },
          approved:  { bg: '#DCFCE7', fg: '#15803D', dot: '#22A55B' },
          rejected:  { bg: '#FEE2E2', fg: '#B91C1C', dot: '#EF4444' },
          cancelled: { bg: '#1F2937', fg: '#FFFFFF', dot: '#374151' },
        },
        plant: {
          1: '#2563EB',
          2: '#EAB308',
          3: '#22A55B',
          4: '#F97316',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04)',
        tooltip: '0 4px 12px rgba(16,24,40,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
    },
  },
  plugins: [],
}
