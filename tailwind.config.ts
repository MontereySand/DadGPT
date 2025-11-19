import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dadgpt-sans)", "Inter", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        base: "#050509",
        surface: "#111116",
        "surface-muted": "#1C1D22",
        "surface-highlight": "#1F2027",
        accent: "#FFFFFF",
        muted: "#9B9BA8",
        border: "#2A2B33",
        "border-strong": "#3B3C45",
        "brand-blue": "#3A8BFF",
        "badge-gray": "#2B2C33",
      },
      boxShadow: {
        card: "0 20px 45px rgba(0,0,0,0.55)",
        input: "0 0 0 1px rgba(255,255,255,0.08)",
      },
      maxWidth: {
        content: "900px",
      },
    },
  },
  plugins: [],
};

export default config;

