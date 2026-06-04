import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oranje: {
          DEFAULT: "#FF6B00",
          50: "#FFF4EC",
          100: "#FFE3CC",
          500: "#FF6B00",
          600: "#E55E00",
          700: "#B84B00",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
