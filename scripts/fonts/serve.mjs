// Static server for the font test page (tests/fonts/). Dev-only; never part of the site.
// Usage: node scripts/fonts/serve.mjs [--port 4322] [--host 127.0.0.1]
// For phone testing on the same Wi-Fi: --host 0.0.0.0, then open http://<this computer's LAN IP>:4322/font-test.html
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../tests/fonts/", import.meta.url));
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const port = Number(arg("--port", "4322"));
const host = arg("--host", "127.0.0.1");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const file = normalize(join(ROOT, path === "/" ? "font-test.html" : path));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error("not a file");
  } catch {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "x-robots-tag": "noindex, nofollow",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}).listen(port, host, () => console.log(`font test page: http://${host}:${port}/font-test.html`));
