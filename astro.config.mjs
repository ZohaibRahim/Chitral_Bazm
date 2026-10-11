// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Static output only (PRD v3.1 §4). No server adapter in Phases 1–3.
export default defineConfig({
  output: "static",
  trailingSlash: "always",
  integrations: [
    // React is only for islands in src/components/islands/ (PRD §4, D-06).
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
