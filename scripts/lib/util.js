import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const POSTS_DIR = path.join(ROOT, "content", "posts");
export const PUBLIC = path.join(ROOT, "public");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function loadEnv() {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch {
    /* no .env file, that's fine until a script needs a key */
  }
}

export function requireEnv(...names) {
  loadEnv();
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing ${missing.join(", ")} in .env (see .env.example).`);
    process.exit(1);
  }
}

export function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readSite() {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "site.json"), "utf8"));
  site.site_url = site.site_url.replace(/\/+$/, "");
  return site;
}

/** Config values that are empty or start with TODO are treated as missing. */
export function missingSiteUrls(site) {
  return Object.entries(site)
    .filter(([k, v]) => k.endsWith("_url") && (!v || /^TODO/i.test(String(v))))
    .map(([k]) => k);
}

export function toISODate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const m = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function displayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function rfc822(iso) {
  return new Date(`${iso}T08:00:00Z`).toUTCString();
}

export function readingTime(markdown) {
  const words = markdown.replace(/[#>*_`\[\]()!-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Meta descriptions read best under about 160 characters. */
export function metaDescription(text) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  if (flat.length <= 160) return flat;
  const sentences = flat.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > 160) break;
    out += s;
  }
  if (out.trim()) return out.trim();
  return flat.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

/** Turn root-relative src/href into absolute URLs (RSS, Medium export). */
export function absolutizeHtml(html, siteUrl) {
  return html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${siteUrl}/`);
}

export function absolutizeMarkdown(md, siteUrl) {
  return md.replace(/\]\(\/(?!\/)/g, `](${siteUrl}/`);
}

export function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function jsonForScript(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
}
