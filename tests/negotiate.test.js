import test from "node:test";
import assert from "node:assert/strict";
import { prefersMarkdown, markdownAssetPath, negotiate, notFoundMarkdown } from "../scripts/lib/negotiate.js";
import middleware, { config } from "../middleware.js";

const req = (url, accept, method = "GET") => new Request(`https://www.theautomatestack.com${url}`, { method, headers: accept ? { accept } : {} });
const assets = { "/md/index.md": "# Home\n\nHello agents.\n", "/md/services.md": "# Services\n" };
const fetchAsset = async (p) => (assets[p] ? new Response(assets[p]) : new Response("", { status: 404 }));

test("Accept parsing: markdown only when asked and not outranked by HTML", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.8"), true);
  assert.equal(prefersMarkdown("text/markdown, */*"), true);
  assert.equal(prefersMarkdown("text/html, text/markdown;q=0.5"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
  assert.equal(prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8"), false);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown(""), false);
  assert.equal(prefersMarkdown(null), false);
});

test("path mapping to the Markdown mirror", () => {
  assert.equal(markdownAssetPath("/"), "/md/index.md");
  assert.equal(markdownAssetPath("/services/"), "/md/services.md");
  assert.equal(markdownAssetPath("/blog/some-post"), "/md/blog/some-post.md");
  assert.equal(markdownAssetPath("/index.html"), "/md/index.md");
  assert.equal(markdownAssetPath("/../secret"), null);
  assert.equal(markdownAssetPath("/%2e%2e/secret"), null);
});

test("homepage: Markdown with Content-Type text/markdown and Vary: Accept", async () => {
  const res = await negotiate(req("/", "text/markdown"), fetchAsset);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/markdown/);
  assert.match(res.headers.get("vary"), /Accept/i);
  assert.equal(await res.text(), assets["/md/index.md"]);
});

test("HTML requests are left alone", async () => {
  assert.equal(await negotiate(req("/", "text/html"), fetchAsset), null);
  assert.equal(await negotiate(req("/", undefined), fetchAsset), null);
  assert.equal(await negotiate(req("/", "text/markdown", "POST"), fetchAsset), null);
});

test("HEAD returns the headers without a body", async () => {
  const res = await negotiate(req("/", "text/markdown", "HEAD"), fetchAsset);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "");
});

test("unknown path + Accept markdown: 404, Markdown body, link to llms.txt and sitemap", async () => {
  const res = await negotiate(req("/__ora-404-probe-c7n4zh8o", "text/markdown"), fetchAsset);
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^text\/markdown/);
  assert.match(res.headers.get("vary"), /Accept/i);
  const body = await res.text();
  assert.ok(body.length > 20);
  assert.match(body, /llms\.txt/);
  assert.match(body, /sitemap\.xml/);
});

test("404 body does not echo markup or markdown from the path", () => {
  const body = notFoundMarkdown("/x`](javascript:alert(1))<script>");
  assert.doesNotMatch(body, /<script>/);
  assert.doesNotMatch(body, /x`\]/);
});

test("middleware: Markdown for agents, pass-through for browsers, matcher skips assets", async () => {
  const origin = "https://www.theautomatestack.com";
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.ok(String(url).startsWith(origin));
    return fetchAsset(new URL(String(url)).pathname);
  };
  try {
    const md = await middleware(req("/services/", "text/markdown"));
    assert.equal(md.status, 200);
    assert.match(md.headers.get("content-type"), /^text\/markdown/);
    const html = await middleware(req("/services/", "text/html"));
    assert.equal(html.headers.get("x-middleware-next"), "1");
    const miss = await middleware(req("/nope", "text/markdown"));
    assert.equal(miss.status, 404);
  } finally {
    globalThis.fetch = realFetch;
  }
  const re = new RegExp(`^${config.matcher[0]}$`);
  for (const ok of ["/", "/services/", "/blog/post-slug/", "/__ora-404-probe-c7n4zh8o"]) assert.ok(re.test(ok), ok);
  for (const skip of ["/md/index.md", "/api/lead", "/assets/css/brand.css", "/llms.txt", "/sitemap.xml"]) assert.ok(!re.test(skip), skip);
});
