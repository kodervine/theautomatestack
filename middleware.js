// Vercel Routing Middleware: Markdown content negotiation. Logic lives in scripts/lib/negotiate.js.
// Runs before static files are served, so "Accept: text/markdown" on any page returns its Markdown mirror
// (built into public/md/ by npm run build). Everything else continues to the normal HTML response.
import { negotiate } from "./scripts/lib/negotiate.js";

export const config = {
  // Pages only: skip the Markdown mirror itself, the API, and files with an extension (images, css, llms.txt...).
  matcher: ["/((?!md/|api/|assets/|.*\\.[a-zA-Z0-9]+$).*)"],
};

export default async function middleware(request) {
  const origin = new URL(request.url).origin;
  const response = await negotiate(request, (assetPath) => fetch(`${origin}${assetPath}`, { headers: { accept: "text/plain" } }));
  // A null response means "not a Markdown request": continue to the static HTML.
  return response || new Response(null, { headers: { "x-middleware-next": "1" } });
}
