import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // BloodLink "Calm Clinical Urgency" palette
        canvas: "#FAFAFA",
        surface: "#FFFFFF",
        crimson: {
          DEFAULT: "#C81E1E",
          dark: "#991B1B",
          light: "#FEE2E2",
        },
        teal: {
          DEFAULT: "#0D9488",
          dark: "#0F766E",
          light: "#CCFBF1",
        },
        slate: {
          DEFAULT: "#0F172A",
          muted: "#334155",
          light: "#F1F5F9",
        },
        amber: {
          light: "#FEF3C7",
          dark: "#92400E",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      maxWidth: {
        app: "480px",
        "app-lg": "560px",
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
