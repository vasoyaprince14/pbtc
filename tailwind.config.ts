import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef7ed",
          100: "#fdecd3",
          200: "#fbd5a5",
          300: "#f7b76d",
          400: "#f39033",
          500: "#f0740f",
          600: "#e15a05",
          700: "#ba4308",
          800: "#94360e",
          900: "#782d0f",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
