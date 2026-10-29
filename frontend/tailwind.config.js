/** Design tokens from the Design Spec section 3. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#E8E9EC", surface: "#FFFFFF", muted: "#F2F4F4", ink: "#16171A", "ink-muted": "#6B7078",
        accent: "#D4380C", "accent-tint": "#FCE8E4", "accent-orange": "#FE5521",
        "teal-deep": "#126463", teal: "#00ABB4", "teal-icon": "#22B5BD", "teal-tint": "#E3F9FD", hairline: "#ECECEC",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "Sora", "system-ui", "sans-serif"],
        sans: ["Inter", "Geist", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { card: "20px", frame: "28px" },
      boxShadow: { card: "0 1px 2px rgba(22,23,26,0.04), 0 4px 16px rgba(22,23,26,0.04)" },
    },
  },
  plugins: [],
};
