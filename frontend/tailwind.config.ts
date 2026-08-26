import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#7C3AED",
          dark: "#5B21B6",
          light: "#EDE9FE",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        // UI Backgrounds
        background: "#F5F5F7",
        surface: "#F9F9FB",
        card: "#FFFFFF",
        // Borders
        border: "#E5E7EB",
        // Text
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        textLight: "#9CA3AF",
        // Actions
        whatsapp: "#25D366",
        // Admin sidebar
        sidebar: "#111827",
        // Semantic
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        // Accent
        accent: "#7C3AED",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        md: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
        lg: "0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
        card: "0 2px 8px rgba(0,0,0,0.06)",
        violet: "0 4px 15px rgba(124, 58, 237, 0.3)",
        whatsapp: "0 4px 15px rgba(37, 211, 102, 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
