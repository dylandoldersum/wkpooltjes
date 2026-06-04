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
      keyframes: {
        progress: {
          "0%": { transform: "scaleX(0)", opacity: "1" },
          "60%": { transform: "scaleX(0.8)", opacity: "1" },
          "100%": { transform: "scaleX(1)", opacity: "0.4" },
        },
      },
      animation: {
        progress: "progress 2.4s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
