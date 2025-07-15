export default {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts}'
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
}; 