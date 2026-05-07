/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary, #4F46E5)', // Default Indigo 600
          secondary: 'var(--brand-secondary, #1e293b)', // Default Slate 800
          accent: 'var(--brand-accent, #8b5cf6)', // Default Violet 500
        }
      }
    },
  },
  plugins: [],
}