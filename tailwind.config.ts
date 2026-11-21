import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B10",
        surface: {
          DEFAULT: "#0F141C",
          elevated: "#151B26",
          border: "#1E2738",
          hover: "#1A2232",
        },
        blood: {
          50: "#FFF1F2",
          500: "#E11D48",
          600: "#BE123C",
          700: "#9F1239",
          DEFAULT: "#DC2626",
          glow: "#FF2A4D",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          DEFAULT: "#F59E0B",
          glow: "#FFB020",
        },
        cyan: {
          400: "#22D3EE",
          500: "#06B6D4",
          DEFAULT: "#00E5FF",
          glow: "#00F0FF",
        },
        teal: {
          400: "#2DD4BF",
          DEFAULT: "#14B8A6",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Sora", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar 4s linear infinite",
        "beacon": "beacon 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        beacon: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      boxShadow: {
        "glow-blood": "0 0 25px -5px rgba(220, 38, 38, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(0, 229, 255, 0.4)",
        "glow-amber": "0 0 25px -5px rgba(245, 158, 11, 0.4)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};

export default config;
