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
          primary: "var(--lmn-primary)",
          whatsapp: "var(--lmn-whatsapp)",
          dark: "var(--lmn-dark)",
          muted: "var(--lmn-muted)",
          card: "var(--lmn-card)",
          border: "var(--lmn-border)",
        },
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        heading: ["Manrope", "Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
    },
  },
  plugins: [],
};
export default config;
