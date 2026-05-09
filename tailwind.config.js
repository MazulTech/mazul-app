/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mazul: {
          cream:  '#F5F0E8',
          sand:   '#E8DCC8',
          bark:   '#2C2416',
          stone:  '#7A6E5F',
          moss:   '#1D4A2A',
          leaf:   '#2D7A47',
          mist:   '#F0EDE8',
          amber:  '#C17B2A',
        },
      },
    },
  },
  plugins: [],
}


