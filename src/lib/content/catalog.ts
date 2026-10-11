// The only way pages, the search index (T-11) and the sitemap (T-32) may obtain songs.
// Non-publishable songs never leave this function in production (PRD §6: no page, no search entry, no sitemap entry).
import { getCollection } from "astro:content";
import { resolveSiteMode, selectCatalog, type CatalogEntry, type SiteMode } from "../rights/publishability";

export function currentSiteMode(): SiteMode {
  return resolveSiteMode({ dev: import.meta.env.DEV, siteModeEnv: process.env["KLA_SITE_MODE"] });
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  const songs = (await getCollection("songs")).map((entry) => entry.data);
  return selectCatalog(songs, currentSiteMode());
}
