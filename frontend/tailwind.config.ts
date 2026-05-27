import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Aeonik", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Navigate typography scale — token-driven, no exceptions
        xs: ["10.8px", { lineHeight: "1.2" }],
        sm: ["11.7px", { lineHeight: "1.3" }],
        md: ["12.6px", { lineHeight: "1.35" }],
        base: ["14.4px", { lineHeight: "17.28px" }],
        lg: ["14.4px", { lineHeight: "17.28px" }],
        xl: ["16.2px", { lineHeight: "1.35" }],
        "2xl": ["21.6px", { lineHeight: "1.2" }],
        "3xl": ["82.8px", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Navigate semantic surface tokens
        "surface-base": "hsl(var(--surface-base))",
        "surface-raised": "hsl(var(--surface-raised))",
        "surface-muted": "hsl(var(--surface-muted))",
      },
      borderRadius: {
        // Navigate radius scale
        xs: "20.7px",
        sm: "25.15px",
        md: "20.7px",
        lg: "25.15px",
        xl: "25.15px",
        full: "9999px",
      },
      transitionDuration: {
        // Navigate motion scale
        instant: "100ms",
        fast: "200ms",
        normal: "300ms",
      },
      spacing: {
        // Navigate spacing tokens — fine-grain, preserved verbatim
        "nv-1": "0.9px",
        "nv-2": "1.53px",
        "nv-3": "1.8px",
        "nv-4": "4.5px",
        "nv-5": "6.46px",
        "nv-6": "8.1px",
        "nv-7": "9px",
        "nv-8": "18px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
