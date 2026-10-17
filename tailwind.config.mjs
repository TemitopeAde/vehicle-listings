export default {
  content: ["./src/**/*.{astro,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--primary))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "#fff" },
        secondary: { DEFAULT: "#f1f4f1", foreground: "#263d31" },
        muted: { DEFAULT: "#f4f6f4", foreground: "#59685f" },
        destructive: { DEFAULT: "#b83737", foreground: "#fff" },
      },
      borderRadius: { lg: "12px", md: "8px", sm: "6px" },
    },
  },
  plugins: [],
};
