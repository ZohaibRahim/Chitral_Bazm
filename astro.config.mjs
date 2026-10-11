// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Site mode (see src/lib/rights/publishability.ts). Fails the build on any unknown value rather than guessing.
// A preview build (synthetic fixtures visible, everything noindex) is written to dist-preview/, never to dist/,
// so it cannot overwrite the production output that would be deployed.
const SITE_MODE = process.env["KLA_SITE_MODE"] ?? "";
if (!["", "production", "preview"].includes(SITE_MODE)) {
  throw new Error(`KLA_SITE_MODE must be "production" or "preview", got "${SITE_MODE}"`);
}

// Static output only (PRD v3.1 §4). No server adapter in Phases 1–3.
export default defineConfig({
  output: "static",
  outDir: SITE_MODE === "preview" ? "./dist-preview" : "./dist",
  trailingSlash: "always",
  integrations: [
    // React is only for islands in src/components/islands/ (PRD §4, D-06).
    react(),
    {
      // Tells the catalog whether this is the `astro dev` server. Builds are never "development", whatever NODE_ENV is.
      name: "kla-site-mode",
      hooks: {
        "astro:config:setup": ({ command, updateConfig }) => {
          updateConfig({ vite: { define: { __KLA_DEV_SERVER__: JSON.stringify(command === "dev") } } });
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
