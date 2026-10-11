// Minimal static file server for built output (dist/ or dist-preview/). Test tooling only; never deployed.
// Directory URLs serve index.html; unknown paths serve 404.html (if present) with status 404.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export function serveStatic(dir, port, host = "127.0.0.1") {
  const root = resolve(dir) + sep;
  return new Promise((ready) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      let file = normalize(join(root, path));
      if (!file.startsWith(root)) return res.writeHead(403).end();
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) {
        const notFound = join(root, "404.html");
        res.writeHead(404, { "content-type": TYPES[".html"] });
        return existsSync(notFound) ? createReadStream(notFound).pipe(res) : res.end("not found");
      }
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
    });
    server.listen(port, host, () => ready(server));
  });
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("serve-static.mjs")) {
  const [dir = "dist", port = "4321"] = process.argv.slice(2);
  await serveStatic(dir, Number(port));
  console.log(`serving ${dir} on http://127.0.0.1:${port}/`);
}
