// npm run dev [-- --drafts] [-- --port 3000]
// Builds into dist/dev (never into public/), serves the whole site, rebuilds on change.
// Also runs api/lead.js for POST /api/lead, so you can test the freebie form locally.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ROOT, PUBLIC, loadEnv } from "./lib/util.js";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const drafts = args.includes("--drafts");
const portIdx = args.indexOf("--port");
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 3000;
const OUT = path.join(ROOT, "dist", "dev");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4", ".woff2": "font/woff2",
};

function rebuild() {
  // A fresh process every time, so changes to scripts, templates and config are always used.
  const args = [path.join(ROOT, "scripts", "build.js"), "--out", OUT];
  if (drafts) args.push("--drafts");
  spawnSync(process.execPath, args, { stdio: "inherit" });
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  for (const base of [OUT, PUBLIC]) {
    // The generated blog lives in dist/dev; everything else (logo, existing pages, images) comes from the root.
    const target = path.normalize(path.join(base, clean));
    if (!target.startsWith(base)) continue;
    for (const candidate of [target, path.join(target, "index.html")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

loadEnv();

async function runApi(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  req.body = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
  res.status = (code) => { res.statusCode = code; return res; };
  const { default: handler } = await import(`../api/lead.js?t=${Date.now()}`);
  await handler(req, res);
}

http.createServer((req, res) => {
  if (req.url.split("?")[0] === "/api/lead") {
    return runApi(req, res).catch((err) => { console.error(err); res.statusCode = 500; res.end("Server error"); });
  }
  const file = resolveFile(req.url);
  if (!file || file.startsWith(path.join(ROOT, "node_modules")) || file.startsWith(path.join(ROOT, ".git"))) {
    const notFound = [OUT, PUBLIC].map((b) => path.join(b, "404.html")).find((f) => fs.existsSync(f));
    res.writeHead(404, { "content-type": notFound ? "text/html; charset=utf-8" : "text/plain" });
    return res.end(notFound ? fs.readFileSync(notFound) : "Not found");
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${port} is already in use, probably by another preview.\nOpen http://localhost:${port}/ to see it, or use another port: npm run dev -- --port ${port + 1}\n`);
    process.exit(1);
  }
  throw err;
}).listen(port, () => {
  console.log(`\nPreview: http://localhost:${port}/blog/${drafts ? "   (including drafts)" : ""}\nWatching content, templates, assets and config. Ctrl+C to stop.\n`);
});

rebuild();
let timer;
for (const dir of ["content", "templates", "config", "scripts", "public/assets/css"]) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}
