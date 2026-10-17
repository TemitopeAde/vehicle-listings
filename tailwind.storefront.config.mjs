// Storefront widgets render inside merchants' Wix sites, so utilities are scoped
// under `.autohaus` and Tailwind's global preflight reset is disabled.
export default {
  content: ["./src/storefront/**/*.{ts,tsx}"],
  important: ".autohaus",
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        border: "var(--sf-border)",
        input: "var(--sf-border)",
        ring: "var(--accent)",
        background: "var(--sf-bg)",
        foreground: "var(--sf-fg)",
        primary: { DEFAULT: "var(--accent)", foreground: "#fff" },
        muted: { DEFAULT: "var(--sf-subtle)", foreground: "var(--sf-muted)" },
        destructive: { DEFAULT: "var(--sf-danger)", foreground: "#fff" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "min(var(--radius), 8px)",
        sm: "min(var(--radius), 6px)",
      },
    },
  },
  plugins: [],
};
