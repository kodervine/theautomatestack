// npm run check [-- <dir>]   (default: public/)
// Checks generated pages: structure, SEO tags, JSON-LD, sitemap, RSS, robots, llms.txt and internal links.
import fs from "node:fs";
import path from "node:path";
import { PUBLIC, readSite } from "./lib/util.js";

const dir = path.resolve(process.argv[2] || PUBLIC);
const site = readSite();
const problems = [];
let checked = 0;
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const VOID = new Set(["meta", "link", "img", "br", "hr", "input", "source", "area", "base", "col", "embed", "track", "wbr"]);

function balanced(markup, where, { xml = false } = {}) {
  const src = markup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "<$1></$1>");
  const stack = [];
  for (const m of src.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const [, close, name, rest] = m;
    const tag = xml ? name : name.toLowerCase();
    if (!close && (rest.trim().endsWith("/") || (!xml && VOID.has(tag)))) continue;
    if (!close) stack.push(tag);
    else if (stack.pop() !== tag) return fail(where, `unbalanced tag </${name}>`);
  }
  if (stack.length) fail(where, `unclosed <${stack.pop()}>`);
}

function exists(urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!clean || clean.startsWith("/api/")) return true;
  for (const base of [dir, PUBLIC]) {
    const p = path.join(base, clean);
    if (fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")))) return true;
  }
  return false;
}

function checkHtml(file) {
  const rel = path.relative(dir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  checked += 1;
  if (!html.includes('class="site-header"')) {
    // Hand-written page (Tailwind): only check that its links and files exist.
    for (const m of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) if (!exists(m[1])) fail(rel, `broken internal link ${m[1]}`);
    return;
  }
  if (!/^<!DOCTYPE html>/i.test(html)) fail(rel, "missing doctype");
  if (!/<html lang="/.test(html)) fail(rel, "missing html lang");
  balanced(html, rel);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) fail(rel, `expected 1 h1, found ${h1}`);
  const meta = (re) => re.test(html);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(rel, "missing title");
  if (!meta(/<meta name="description" content="[^"]+"/)) fail(rel, "missing meta description");
  if (!meta(/<link rel="canonical" href="https:\/\/[^"]+"/)) fail(rel, "missing absolute canonical");
  for (const p of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
    if (!meta(new RegExp(`<meta property="${p}" content="[^"]+"`))) fail(rel, `missing ${p}`);
  }
  for (const n of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    if (!meta(new RegExp(`<meta name="${n}" content="[^"]+"`))) fail(rel, `missing ${n}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) fail(rel, `image without alt: ${m[0].slice(0, 60)}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) fail(rel, `duplicate id "${id}"`);
  if (/\{\{|\}\}/.test(html)) fail(rel, "unrendered template tag");
  if (/TODO/.test(html)) fail(rel, "TODO placeholder is visible on the page");

  // JSON-LD
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const isPost = /\/blog\/[^/]+\/index\.html$/.test("/" + rel) && !/\/(tags|page)\//.test("/" + rel) && rel !== "blog/index.html";
  const types = [];
  for (const raw of blocks) {
    try {
      const j = JSON.parse(raw);
      types.push(j["@type"]);
      if (j["@type"] === "Article") {
        for (const k of ["headline", "description", "datePublished", "dateModified", "author", "publisher", "mainEntityOfPage", "image"]) {
          if (!j[k]) fail(rel, `Article JSON-LD missing ${k}`);
        }
        if (j.author?.name !== site.author_name) fail(rel, "Article author name is wrong");
        if (j.publisher?.name !== site.publisher_name) fail(rel, "Article publisher name is wrong");
        if (!j.publisher?.sameAs?.length) fail(rel, "Article publisher has no sameAs");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(j.datePublished || "")) fail(rel, "bad datePublished");
      }
      if (j["@type"] === "FAQPage") {
        if (!j.mainEntity?.length) fail(rel, "FAQPage has no questions");
        const faqCount = (html.match(/<h3>/g) || []).length;
        if (j.mainEntity.length > faqCount) fail(rel, "FAQPage lists questions not visible on the page");
      }
    } catch (err) {
      fail(rel, `JSON-LD does not parse: ${err.message}`);
    }
  }
  if (isPost) {
    if (!types.includes("Article")) fail(rel, "post has no Article JSON-LD");
    for (const label of ["Follow on Instagram", "Follow on TikTok", "Subscribe on YouTube", "Get the Starter Kit", "Visit the site"]) {
      if (!html.includes(`>${label}</a>`)) fail(rel, `CTA missing "${label}"`);
    }
    if (!html.includes('class="author"')) fail(rel, "no author box");
    if (!/class="answer"/.test(html)) fail(rel, "no summary/answer block");
  }

  // Internal links and assets
  for (const m of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) {
    if (!exists(m[1])) fail(rel, `broken internal link ${m[1]}`);
  }
}

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return ["images", "assets", "api"].includes(e.name) ? [] : walk(p);
    return e.name.endsWith(".html") ? [p] : [];
  });
}

const blogDir = path.join(dir, "blog");
for (const f of walk(dir)) checkHtml(f);

// sitemap
const sm = path.join(dir, "sitemap.xml");
if (!fs.existsSync(sm)) fail("sitemap.xml", "missing");
else {
  const xml = fs.readFileSync(sm, "utf8");
  balanced(xml, "sitemap.xml", { xml: true });
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (!locs.length) fail("sitemap.xml", "no URLs");
  for (const loc of locs) {
    if (!loc.startsWith(site.site_url + "/")) fail("sitemap.xml", `URL not on ${site.site_url}: ${loc}`);
    else if (!exists(loc.slice(site.site_url.length))) fail("sitemap.xml", `URL has no file: ${loc}`);
  }
  if (new Set(locs).size !== locs.length) fail("sitemap.xml", "duplicate URLs");
  for (const m of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1])) fail("sitemap.xml", `bad lastmod ${m[1]}`);
  if (/\/(sample|draft)/i.test(xml) && !process.argv.includes("--allow-drafts")) fail("sitemap.xml", "contains a sample/draft URL");
  console.log(`sitemap.xml: ${locs.length} URL(s)`);
}

// rss
const rss = path.join(blogDir, "rss.xml");
if (fs.existsSync(rss)) {
  const xml = fs.readFileSync(rss, "utf8");
  balanced(xml, "blog/rss.xml", { xml: true });
  if (!/<rss version="2.0"/.test(xml)) fail("blog/rss.xml", "not RSS 2.0");
  const items = xml.split("<item>").slice(1);
  for (const it of items) {
    for (const t of ["title", "link", "guid", "pubDate", "description"]) if (!new RegExp(`<${t}[ >]`).test(it)) fail("blog/rss.xml", `item missing <${t}>`);
    if (/(src|href)="\//.test(it)) fail("blog/rss.xml", "item has a relative URL, feeds need absolute ones");
  }
  console.log(`blog/rss.xml: ${items.length} item(s)`);
}

for (const f of ["robots.txt", "llms.txt"]) if (!fs.existsSync(path.join(dir, f))) fail(f, "missing");
const robots = fs.existsSync(path.join(dir, "robots.txt")) && fs.readFileSync(path.join(dir, "robots.txt"), "utf8");
if (robots && !robots.includes(`Sitemap: ${site.site_url}/sitemap.xml`)) fail("robots.txt", "missing Sitemap line");

console.log(`Checked ${checked} HTML page(s).`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  x ${p}`);
  process.exit(1);
}
console.log("All checks passed.");
