// Markdown content negotiation (https://acceptmarkdown.com). Pure functions, no Node APIs, so it runs in
// Vercel Routing Middleware (middleware.js) and in the local dev server (scripts/dev.js).
//
//   Accept: text/markdown  -> the page as Markdown, Content-Type: text/markdown, Vary: Accept
//   anything else          -> untouched (HTML)
//   Unknown path + markdown -> 404 with a Markdown body that points to llms.txt and the sitemap

export const SITE_URL = "https://www.theautomatestack.com";

/** q-value for one media range in an Accept header, or null when the range is not listed. */
function quality(accept, range) {
  let best = null;
  for (const part of String(accept || "").split(",")) {
    const [type, ...params] = part.trim().toLowerCase().split(";").map((s) => s.trim());
    if (type !== range) continue;
    const q = params.map((p) => p.match(/^q=([\d.]+)$/)).find(Boolean);
    const n = q ? Number(q[1]) : 1;
    best = Math.max(best ?? 0, Number.isFinite(n) ? n : 0);
  }
  return best;
}

/** True when the client asked for text/markdown and does not prefer HTML over it. */
export function prefersMarkdown(accept) {
  const md = quality(accept, "text/markdown");
  if (!md) return false;
  const html = quality(accept, "text/html") ?? quality(accept, "text/*") ?? quality(accept, "*/*") ?? 0;
  return md >= html;
}

/** "/services/" -> "/md/services.md", "/" -> "/md/index.md". Returns null for paths that are not pages. */
export function markdownAssetPath(pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return null; }
  p = p.replace(/\/index\.html$/, "/").replace(/^\/+|\/+$/g, "");
  if (p.includes("..") || p.includes("\\") || p.includes("//")) return null;
  return `/md/${p ? p : "index"}.md`;
}

const MD_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
  "Cache-Control": "public, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export function notFoundMarkdown(pathname) {
  const shown = String(pathname).replace(/[^\w\-./~%]/g, "").slice(0, 120);
  return `# Page not found (404)

There is no page at \`${shown}\` on ${SITE_URL.replace("https://", "")}. The link may be old or mistyped.

Find the right page here:

- [llms.txt](${SITE_URL}/llms.txt): what this site is, when to use it, and every page with a short description
- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL
- [Home page](${SITE_URL}/)
- [Blog](${SITE_URL}/blog/)
`;
}

/**
 * Handle one request. fetchAsset(path) must resolve to a Response (404 when the file is missing).
 * Returns a Response when the request is for Markdown, or null to let the normal HTML flow continue.
 */
export async function negotiate(request, fetchAsset) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  if (!prefersMarkdown(request.headers.get("accept"))) return null;
  const { pathname } = new URL(request.url);
  const asset = markdownAssetPath(pathname);
  const upstream = asset ? await fetchAsset(asset) : null;
  if (upstream && upstream.ok) {
    return new Response(method === "HEAD" ? null : await upstream.text(), { status: 200, headers: MD_HEADERS });
  }
  return new Response(method === "HEAD" ? null : notFoundMarkdown(pathname), { status: 404, headers: MD_HEADERS });
}
