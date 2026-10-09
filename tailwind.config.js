/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0B1020",
          elevated: "#121A2B",
        },
        border: "rgba(148, 163, 184, 0.12)",
        panel: "#121A2B",
        ink: {
          DEFAULT: "#E6EAF2",
          muted: "#94A3B8",
          faint: "#64748B",
        },
        accent: {
          violet: "#7C5CFC",
          blue: "#3B82F6",
          cyan: "#22D3EE",
        },
        status: {
          present: "#22C55E",
          absent: "#F43F5E",
          late: "#F59E0B",
          cancelled: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(124,92,252,0.25), 0 8px 30px -8px rgba(124,92,252,0.35)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #7C5CFC 0%, #3B82F6 50%, #22D3EE 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
