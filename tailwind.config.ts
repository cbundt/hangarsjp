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
        hangar: {
          blue: "#1B3A6B",
          orange: "#F05A28",
          light: "#F4F6FA",
        },
      },
    },
  },
  plugins: [],
};

export default config;
