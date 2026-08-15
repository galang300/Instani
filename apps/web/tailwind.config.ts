import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15202b",
        field: "#f6f4ee",
        rice: "#f4d35e",
        leaf: "#2f7d57",
        chili: "#c83e4d",
        water: "#277da1"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(21, 32, 43, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
