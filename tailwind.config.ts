import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#1a263c",
        surface: "#0b1220",
        "surface-light": "#111b2e",
      },
    },
  },
  plugins: [],
};
export default config;
