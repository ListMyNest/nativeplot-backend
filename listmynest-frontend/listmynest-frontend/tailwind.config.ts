import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-red-500",
    "bg-green-500",
    "bg-white",
    "text-white",
    "text-red-500",
    "rounded-full",
    "flex",
    "grid",
    "hidden",
    "block",
  ],
  theme: {
    extend: {
      colors: {
        lmn: {
          primary: "#E63946",
          dark: "#1A1A2E",
          muted: "#6B7280",
          card: "#F8F9FA",
          border: "#E5E7EB",
          verified: "#2D6A4F",
          whatsapp: "#25D366",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
