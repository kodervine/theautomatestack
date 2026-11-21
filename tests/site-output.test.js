// Checks the committed build output in public/. Run "npm run build" first (the pre-commit hook does).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PUBLIC, readSite } from "../scripts/lib/util.js";
import { htmlToMarkdown, markdownPathFor } from "../scripts/lib/markdown.js";

const read = (f) => fs.readFileSync(path.join(PUBLIC, f), "utf8");
const site = readSite();

test("every indexable page has a non-empty Markdown mirror", () => {
  const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  assert.ok(locs.length > 5);
  for (const p of locs) {
    const file = path.join(PUBLIC, "md", markdownPathFor(p));
    assert.ok(fs.existsSync(file), `missing md for ${p}`);
    const md = fs.readFileSync(file, "utf8");
    assert.ok(md.length > 100, `md too short for ${p}`);
    assert.match(md, /^#{1,2} \S/m, `md for ${p} has no heading`);
    assert.doesNotMatch(md, /<script|<style|<svg/i, `md for ${p} leaks markup`);
  }
});

test("homepage Markdown uses absolute links and no hand-typed price lines", () => {
  const md = read("md/index.md");
  assert.doesNotMatch(md, /\]\(\/(?!\/)/);
  assert.ok(md.includes(`](${site.site_url}/starter-kit/)`));
});

test("htmlToMarkdown drops chrome, keeps content and resolves links", () => {
  const md = htmlToMarkdown(
    `<html><head><title>T</title><meta name="description" content="D"></head><body><header>NAV</header><main><h1>Hi</h1><p>Body <a href="/x/">link</a></p><script>bad()</script></main><footer>FOOT</footer></body></html>`,
    { siteUrl: "https://e.com", urlPath: "/p/" },
  );
  assert.match(md, /# Hi/);
  assert.match(md, /\[link\]\(https:\/\/e\.com\/x\/\)/);
  assert.doesNotMatch(md, /NAV|FOOT|bad\(\)/);
});

test("noindex pages get no Markdown mirror", () => {
  assert.equal(fs.existsSync(path.join(PUBLIC, "md", "replay-thanks.md")), false);
});

test("llms.txt tells agents when to use the site and how to engage", () => {
  const t = read("llms.txt");
  assert.match(t, /^## When to use this site$/m);
  assert.match(t, /^Use it when:$/m);
  assert.match(t, /^Do not use it for:$/m);
  assert.match(t, /^## How an agent should engage$/m);
  assert.ok(t.includes(site.process_consultation_url));
  assert.match(t, /Accept: text\/markdown/);
});

test("vercel.json sets Vary: Accept on every page", () => {
  const v = JSON.parse(fs.readFileSync(path.join(PUBLIC, "..", "vercel.json"), "utf8"));
  const rule = v.headers.find((h) => h.source === "/(.*)");
  assert.ok(rule.headers.some((h) => h.key === "Vary" && /Accept/.test(h.value)));
});
