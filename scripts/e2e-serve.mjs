// Playwright web server for the "site" project.
// 1. Production build -> dist/ (public catalog: synthetic fixtures excluded) served on :4321.
// 2. Preview build (KLA_SITE_MODE=preview) -> dist-preview/ (fixtures rendered through the real song pages, noindex)
//    served on :4323.
// Builds run one after the other because they share Astro's content cache. The preview server starts first so that
// :4321 answering (what Playwright waits for) means both are ready.
import { spawnSync } from "node:child_process";
import { serveStatic } from "./serve-static.mjs";

function build(env, label) {
  const result = spawnSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build", "--force"], {
    stdio: "inherit",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...env },
  });
  if (result.status !== 0) {
    console.error(`${label} build failed`);
    process.exit(result.status ?? 1);
  }
}

build({ KLA_SITE_MODE: "" }, "production");
build({ KLA_SITE_MODE: "preview" }, "preview");
await serveStatic("dist-preview", 4323);
await serveStatic("dist", 4321);
console.log("site e2e servers: production http://127.0.0.1:4321/  preview http://127.0.0.1:4323/");
