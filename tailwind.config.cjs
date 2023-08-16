/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontSize: {
        xxs: ['0.7rem', { lineHeight: '1rem' }],
      },
      colors: {
        relisten: {
          100: '#279bbc',
        },
      },
    },
  },
  plugins: [],
};
