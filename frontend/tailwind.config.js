/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2431",       // near-black slate for text
        paper: "#F6F5F1",     // warm off-white background
        panel: "#FFFFFF",
        line: "#E4E1D8",      // hairline borders
        brand: {
          DEFAULT: "#2F5D50", // deep warehouse-ledger green
          light: "#3F7A68",
          dark: "#1F4038",
        },
        accent: "#C4622D",    // stamped-invoice terracotta, used sparingly
        warn: "#B3411A",
        ok: "#2F5D50",
      },
      fontFamily: {
        display: ["'IBM Plex Serif'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
