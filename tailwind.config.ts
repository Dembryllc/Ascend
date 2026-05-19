import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f8f3e8",
        surface: "#fffaf1",
        surface2: "#f2eadc",
        ink: "#1a1530",
        ink2: "#4c445f",
        muted: "#7a7187",
        border: "#e4d9c6",
        violet: "#7454d9",
        violetDeep: "#402486",
        violetSoft: "#ebe3ff",
        pink: "#ef6f9f",
        pinkSoft: "#ffe2ee",
        rose: "#e2556f",
        roseSoft: "#ffe5ea",
        amber: "#d99535",
        amberSoft: "#fff0cf",
        green: "#2da66f",
        greenSoft: "#ddf5e9"
      },
      boxShadow: {
        card: "0 18px 50px rgba(26,21,48,.08)"
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        card: "14px"
      }
    }
  },
  plugins: []
};

export default config;
