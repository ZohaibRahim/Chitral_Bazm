// The only way pages, the search index (T-11) and the sitemap (T-32) may obtain songs.
// Non-publishable songs never leave this function in production (PRD §6: no page, no search entry, no sitemap entry).
import { getCollection } from "astro:content";
import { resolveSiteMode, selectCatalog, type CatalogEntry, type SiteMode } from "../rights/publishability";

// "development" is granted ONLY when the command is `astro dev`, as reported by Astro itself (see astro.config.mjs).
// It is never inferred from NODE_ENV or import.meta.env.DEV: a build run with NODE_ENV=test or development would
// otherwise be treated as a dev server and emit synthetic pages (found by tests/build/content-build.test.ts).
declare const __KLA_DEV_SERVER__: boolean;

export function currentSiteMode(): SiteMode {
  return resolveSiteMode({ dev: __KLA_DEV_SERVER__ === true, siteModeEnv: process.env["KLA_SITE_MODE"] });
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  const songs = (await getCollection("songs")).map((entry) => entry.data);
  return selectCatalog(songs, currentSiteMode());
}
