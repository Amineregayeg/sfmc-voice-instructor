import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0b0f14",
          "bg-secondary": "#0d1117",
          "bg-tertiary": "#161b22",
          border: "#30363d",
          text: "#c9d1d9",
          "text-secondary": "#8b949e",
          "text-muted": "#6e7681"
        },
        warm: {
          yellow: "#E6B800",
          "yellow-glow": "#FFD84D",
          "yellow-peak": "#FFF3B0"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate"
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #E6B800, 0 0 10px #E6B800" },
          "100%": { boxShadow: "0 0 10px #FFD84D, 0 0 20px #FFD84D, 0 0 30px #FFD84D" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
