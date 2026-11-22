// Shared helpers for the AutoStack Quick Class functions. Files starting with "_" are not routes on Vercel.
// The links sent to n8n (and on to Resend emails) are built here from config, never taken from the browser,
// so nobody can post a different link and have it emailed out under your name.
import classesData from "../config/classes.json" with { type: "json" };
import site from "../config/site.json" with { type: "json" };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function cleanEmail(v) {
  const email = clean(v, 200).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

/** A live class, or a draft one outside production (so previews and local tests work). */
export function findClass(classId, { allowDrafts = process.env.VERCEL_ENV !== "production" } = {}) {
  const id = clean(classId, 80);
  if (!/^[a-z0-9-]+$/.test(id) || !Object.hasOwn(classesData.classes, id)) return null;
  const c = classesData.classes[id];
  if (c.status === "ready" || (allowDrafts && c.status === "draft")) return { classId: id, ...c };
  return null;
}

export function resolveUrl(u) {
  const s = String(u || "");
  return s.startsWith("site:") ? site[s.slice(5)] || "" : s;
}

/** The Selar link with UTM tags. medium is "watchpage" for the button and "email" for links sent to n8n. */
export function offerUrl(cls, medium) {
  const raw = resolveUrl(cls.ctaUrl);
  if (!raw) return "";
  const u = new URL(raw, site.site_url);
  u.searchParams.set("utm_source", "quickclass");
  u.searchParams.set("utm_medium", medium);
  u.searchParams.set("utm_campaign", cls.classId);
  return u.toString();
}

/** The watch page path for a class. Pass an email to include it (for the redirect and the email link). */
export function watchPath(classId, email) {
  return `/watch/?class=${encodeURIComponent(classId)}${email ? `&e=${encodeURIComponent(email)}` : ""}`;
}

export const watchUrl = (classId, email) => site.site_url + watchPath(classId, email);

export function registerPayload(cls, name, email) {
  return { name, email, classId: cls.classId, classTitle: cls.title, watchUrl: watchUrl(cls.classId, email), offerUrl: offerUrl(cls, "email") };
}

export function watchedPayload(cls, email) {
  return { email, classId: cls.classId, offerUrl: offerUrl(cls, "email"), watchUrl: watchUrl(cls.classId, email) };
}

// Best-effort rate limit per IP. Memory lives only as long as a warm function instance, which is enough to stop a burst.
const hits = new Map();
export function rateLimited(req, { bucket = "register", limit = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const ip = bucket + ":" + String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > limit;
}

export async function postToN8n(envName, payload) {
  const url = process.env[envName];
  if (!url) throw new Error(`${envName} is not set`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`n8n answered ${res.status}`);
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export function readBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}
