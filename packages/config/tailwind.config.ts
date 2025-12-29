import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  // Note: Tailwind v4 primarily relies on @source in CSS.
  // Keeping content here helps editor tooling and legacy fallbacks.
  content: [
    "./apps/**/src/**/*.{ts,tsx}",
    "./packages/ui/src/**/*.{ts,tsx}",
    "./packages/shared/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
