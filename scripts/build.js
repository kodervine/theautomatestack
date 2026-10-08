// Build the blog: node scripts/build.js [--drafts] [--out <dir>]
//   --drafts   also build draft posts (preview only, marked noindex). Use with --out.
//   --out      write somewhere other than the site root (e.g. dist/preview)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT, PUBLIC, esc, readSite, missingSiteUrls, displayDate, rfc822, metaDescription,
  absolutizeHtml, xmlEscape, writeFile,
} from "./lib/util.js";
import { loadAllPosts, sitePosts, tagSlug } from "./lib/posts.js";
import { renderPage } from "./lib/template.js";
import { renderMarkdown, ctaItems, faqHtml, articleJsonLd, faqJsonLd, jsonLdScripts, navMarkup } from "./lib/render.js";
import { buildPages } from "./lib/pages.js";

const KEEP_IN_BLOG = new Set(["images"]); // downloaded Notion images must survive rebuilds
const SKIP_DIRS = new Set(["blog", "assets", "api"]);

export function build({ out = PUBLIC, drafts = false, quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const site = readSite();
  const { posts: allPosts, errors } = loadAllPosts();
  const warnings = [];

  for (const e of errors) {
    const msg = `${e.filename || e.file}: ${e.problems.join("; ")}`;
    if (["ready", "published"].includes(e.status)) {
      throw new Error(`Cannot build, fix this post first: ${msg}`);
    }
    warnings.push(`Skipped invalid draft ${msg}`);
  }
  for (const p of allPosts) {
    if (["ready", "published"].includes(p.status) && /\[CHINENYE|\[SAMPLE\]/i.test(`${p.title}\n${p.summary}\n${p.body}`)) {
      throw new Error(`${p.filename} still has a [CHINENYE: ...] or [SAMPLE] placeholder. Fill it in before it goes live.`);
    }
  }
  for (const k of missingSiteUrls(site)) warnings.push(`config/site.json: "${k}" is missing. Set it before you publish.`);

  const posts = sitePosts(allPosts, { includeDrafts: drafts });
  const skipped = allPosts.length - posts.length;
  const year = new Date().getFullYear();
  const base = {
    ...site,
    year,
    author_initial: site.author_name.charAt(0).toUpperCase(),
    cta_items: ctaItems(site),
    draft_banner: drafts,
    nav_desktop: navMarkup("/blog/", posts.length > 0).desktop,
    nav_mobile: navMarkup("/blog/", posts.length > 0).mobile,
    has_blog: posts.length > 0,
  };

  // Reset blog output (keep downloaded images).
  const blogDir = path.join(out, "blog");
  fs.mkdirSync(blogDir, { recursive: true });
  for (const entry of fs.readdirSync(blogDir)) {
    if (!KEEP_IN_BLOG.has(entry)) fs.rmSync(path.join(blogDir, entry), { recursive: true, force: true });
  }

  // Home, Starter Kit and Freebies pages come from templates; the other pages are hand-written.
  const generated = buildPages({ out, site, posts, drafts });
  const existing = findExistingPages(generated);

  if (posts.length === 0) {
    log(`No posts with status ready or published (${skipped} draft/other skipped). No blog pages written.`);
    writeSiteFiles(out, site, [], existing, warnings);
    report(log, warnings);
    return { posts: [], warnings };
  }

  // Tags
  const tagMap = new Map();
  for (const p of posts) {
    for (const t of p.tags) {
      const s = tagSlug(t);
      if (!s) continue;
      if (!tagMap.has(s)) tagMap.set(s, { slug: s, name: t, posts: [] });
      tagMap.get(s).posts.push(p);
    }
  }
  const tags = [...tagMap.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));

  const card = (p) => ({
    url: `/blog/${p.slug}/`, title: p.title, summary: p.summary,
    date: p.date, date_display: displayDate(p.date), reading_time: p.reading_time,
    thumb: p.image ? `<a class="card-thumb" href="/blog/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${esc(p.image)}" alt="" width="1200" height="630" loading="lazy"></a>` : "",
    label_html: p.tags[0] ? `<p class="label">${esc(p.tags[0])}</p>` : "",
  });
  const noindex = drafts ? "noindex, nofollow" : "";
  const pageCommon = (extra) => ({
    ...base, robots: noindex, og_type: "website", og_image: `${site.site_url}${site.default_og_image}`,
    prev_next_links: "", article_meta: "", jsonld: "", ...extra,
  });

  // Posts
  for (const p of posts) {
    const canonical = `${site.site_url}/blog/${p.slug}/`;
    const image = p.image ? (p.image.startsWith("/") ? site.site_url + p.image : p.image) : `${site.site_url}${site.default_og_image}`;
    const related = posts
      .filter((o) => o.slug !== p.slug)
      .map((o) => ({ o, shared: o.tags.filter((t) => p.tags.includes(t)).length }))
      .filter((x) => x.shared > 0)
      .sort((a, b) => b.shared - a.shared || (a.o.date < b.o.date ? 1 : -1))
      .slice(0, 3)
      .map((x) => card(x.o));
    const desc = metaDescription(p.summary);
    if (!p.image) warnings.push(`${p.filename}: no cover image. Add "image:" to the front matter (see CLAUDE.md).`);
    if (p.title.length > 110) warnings.push(`${p.filename}: title is over 110 characters, search engines may cut it`);
    const articleMeta = [
      `<meta property="article:published_time" content="${p.date}">`,
      `<meta property="article:modified_time" content="${p.updated}">`,
      `<meta property="article:author" content="${esc(site.author_name)}">`,
      ...p.tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`),
    ].join("\n  ");

    const html = renderPage("post.html", {
      ...pageCommon({}),
      page_title: `${p.title} | ${site.publisher_name}`,
      og_title: p.title,
      description: desc,
      canonical,
      og_type: "article",
      og_image: image,
      article_meta: articleMeta,
      jsonld: jsonLdScripts(articleJsonLd(p, site, canonical, image), p.faqs.length ? faqJsonLd(p, canonical) : null),
      title: p.title,
      summary: p.summary,
      date: p.date,
      date_display: displayDate(p.date),
      updated: p.updated,
      updated_display: p.updated !== p.date ? displayDate(p.updated) : "",
      reading_time: p.reading_time,
      tag_links: p.tags.map((t) => `<a href="/blog/tags/${tagSlug(t)}/">${esc(t)}</a>`).join(" "),
      body: renderMarkdown(p.body),
      faq_html: faqHtml(p.faqs),
      related,
    });
    writeFile(path.join(blogDir, p.slug, "index.html"), html);
  }

  // Search data for the blog page (title, summary, tags). The page fetches it only when someone searches or filters.
  writeFile(path.join(blogDir, "search.json"), JSON.stringify(posts.map((p) => ({
    title: p.title, url: `/blog/${p.slug}/`, summary: p.summary, date: p.date,
    date_display: displayDate(p.date), reading_time: p.reading_time, tags: p.tags, image: p.image || "",
  }))));
  const TOP_TAGS = 6;
  const tagChip = (t) => ({ url: `/blog/tags/${t.slug}/`, name: t.name, count: t.posts.length });

  // Blog index (paginated)
  const per = site.posts_per_page || 10;
  const pages = Math.ceil(posts.length / per);
  const pageUrl = (n) => (n === 1 ? "/blog/" : `/blog/page/${n}/`);
  for (let n = 1; n <= pages; n++) {
    const slice = posts.slice((n - 1) * per, n * per).map(card);
    const links = [];
    if (n > 1) links.push(`<link rel="prev" href="${site.site_url}${pageUrl(n - 1)}">`);
    if (n < pages) links.push(`<link rel="next" href="${site.site_url}${pageUrl(n + 1)}">`);
    const pager = pages > 1
      ? `<nav class="pager" aria-label="Pagination">${n > 1 ? `<a rel="prev" href="${pageUrl(n - 1)}">&larr; Newer</a>` : '<span class="spacer"></span>'}<span>Page ${n} of ${pages}</span>${n < pages ? `<a rel="next" href="${pageUrl(n + 1)}">Older &rarr;</a>` : '<span class="spacer"></span>'}</nav>`
      : "";
    const html = renderPage("blog-index.html", {
      ...pageCommon({}),
      page_title: n === 1 ? site.blog_title : `${site.blog_title}, page ${n}`,
      og_title: site.blog_title,
      description: site.blog_description,
      canonical: `${site.site_url}${pageUrl(n)}`,
      prev_next_links: links.join("\n  "),
      heading: site.blog_title,
      tags_top: tags.slice(0, TOP_TAGS).map(tagChip),
      tags_rest: tags.slice(TOP_TAGS).map(tagChip),
      tags_rest_count: Math.max(0, tags.length - TOP_TAGS),
      total_posts: posts.length,
      posts: slice,
      pager,
    });
    writeFile(path.join(blogDir, ...(n === 1 ? [] : ["page", String(n)]), "index.html"), html);
  }

  // Tag pages
  for (const t of tags) {
    const html = renderPage("tag.html", {
      ...pageCommon({}),
      page_title: `${t.name} | ${site.blog_title}`,
      og_title: `${t.name} | ${site.blog_title}`,
      description: `${t.posts.length} ${t.posts.length === 1 ? "post" : "posts"} tagged ${t.name} on ${site.blog_title}.`,
      canonical: `${site.site_url}/blog/tags/${t.slug}/`,
      tag_name: t.name,
      count: t.posts.length,
      post_word: t.posts.length === 1 ? "post" : "posts",
      posts: t.posts.map(card),
    });
    writeFile(path.join(blogDir, "tags", t.slug, "index.html"), html);
  }

  // RSS
  const rssItems = posts.slice(0, 50).map((p) => {
    const url = `${site.site_url}/blog/${p.slug}/`;
    const content = absolutizeHtml(renderMarkdown(p.body), site.site_url).replace(/]]>/g, "]]]]><![CDATA[>");
    return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <dc:creator>${xmlEscape(site.author_name)}</dc:creator>
${p.tags.map((t) => `      <category>${xmlEscape(t)}</category>`).join("\n")}
      <description>${xmlEscape(p.summary)}</description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>`;
  });
  writeFile(path.join(blogDir, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(site.blog_title)}</title>
    <link>${site.site_url}/blog/</link>
    <description>${xmlEscape(site.blog_description)}</description>
    <language>en</language>
    <lastBuildDate>${rfc822(posts[0].updated)}</lastBuildDate>
    <atom:link href="${site.site_url}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems.join("\n")}
  </channel>
</rss>
`);

  writeSiteFiles(out, site, posts, existing, warnings, tags);
  log(`Built ${posts.length} post(s), ${tags.length} tag page(s), ${pages} index page(s) into ${path.relative(ROOT, blogDir)}/`);
  if (skipped && !drafts) log(`Skipped ${skipped} draft/other post(s).`);
  const unpublished = posts.filter((p) => p.status === "ready" && p.notion_id);
  if (unpublished.length && !drafts) {
    log(`\nAfter you deploy, run "npm run mark-published" to set Status = Published in Notion for:`);
    for (const p of unpublished) log(`  - ${p.slug}`);
  }
  report(log, warnings);
  return { posts, warnings };
}

function report(log, warnings) {
  if (warnings.length) {
    log("\nWarnings:");
    for (const w of warnings) log(`  ! ${w}`);
  }
}

/** Pages for the sitemap: the generated ones plus hand-written index.html files one folder deep in public/. */
function findExistingPages(generated) {
  const pages = generated.filter((g) => g.indexable).map((g) => ({ path: g.path, title: g.title, description: g.description }));
  const skip = new Set(generated.map((g) => g.path.split("/")[1]).filter(Boolean));
  for (const d of fs.readdirSync(PUBLIC, { withFileTypes: true })) {
    if (!d.isDirectory() || SKIP_DIRS.has(d.name) || skip.has(d.name) || d.name.startsWith(".")) continue;
    const file = path.join(PUBLIC, d.name, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;
    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, " ").trim() || "";
    const description = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || "";
    pages.push({ path: `/${d.name}/`, title, description });
  }
  return pages;
}

const MARK = "Generated by scripts/build.js. Do not edit by hand.";

/** Write a root file only if we made it, so we never overwrite a hand-made one. */
function writeOwned(out, name, content, marker, warnings) {
  const file = path.join(out, name);
  if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes(MARK)) {
    warnings.push(`${name} already exists and was not made by the build, so I left it alone.`);
    return;
  }
  writeFile(file, content);
}

function writeSiteFiles(out, site, posts, existing, warnings, tags = []) {
  const u = (p) => `${site.site_url}${p}`;
  const urls = existing.map((e) => ({ loc: u(e.path) }));
  if (posts.length) {
    urls.push({ loc: u("/blog/"), lastmod: posts[0].updated });
    for (const p of posts) urls.push({ loc: u(`/blog/${p.slug}/`), lastmod: p.updated });
    for (const t of tags) urls.push({ loc: u(`/blog/tags/${t.slug}/`), lastmod: t.posts[0].updated });
  }
  writeOwned(out, "sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${MARK} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((x) => `  <url>\n    <loc>${xmlEscape(x.loc)}</loc>${x.lastmod ? `\n    <lastmod>${x.lastmod}</lastmod>` : ""}\n  </url>`).join("\n")}
</urlset>
`, MARK, warnings);

  writeOwned(out, "robots.txt", `# ${MARK}
User-agent: *
Allow: /

Sitemap: ${u("/sitemap.xml")}
`, MARK, warnings);

  const pageLine = (e) => `- [${e.title || e.path}](${u(e.path)})${e.description ? `: ${e.description}` : ""}`;
  writeOwned(out, "llms.txt", `# ${site.publisher_name}

> ${site.blog_description}

<!-- ${MARK} -->

## Site

${existing.map(pageLine).join("\n")}
${posts.length ? `\n## Blog\n\n- [${site.blog_title}](${u("/blog/")}): All posts.\n${posts.map((p) => `- [${p.title}](${u(`/blog/${p.slug}/`)}): ${p.summary.replace(/\s+/g, " ")}`).join("\n")}\n` : ""}`, MARK, warnings);
}

// CLI entry
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const drafts = args.includes("--drafts");
  const out = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : PUBLIC;
  if (drafts && out === PUBLIC) {
    console.error('--drafts must be used with --out (for example --out dist/preview) so drafts never reach the live site.');
    process.exit(1);
  }
  try {
    build({ out, drafts });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
