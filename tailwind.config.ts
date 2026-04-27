import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        bg: "#0a0a0a",
        fg: "#ededed",
        accent: "#10b981",
        muted: "#525252",
      },
    },
  },
} satisfies Config;
