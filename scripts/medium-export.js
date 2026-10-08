// npm run medium [-- slug]
// Creates dist/medium/<slug>.md, <slug>.html and README-<slug>.txt for each ready/published post.
// There is no Medium login or scraping here. You import the live post URL into Medium yourself.
import path from "node:path";
import { esc, readSite, absolutizeHtml, absolutizeMarkdown, writeFile, ROOT } from "./lib/util.js";
import { loadAllPosts, mediumPosts } from "./lib/posts.js";
import { renderMarkdown, ctaItems } from "./lib/render.js";

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const site = readSite();
const { posts: all } = loadAllPosts();
let posts = mediumPosts(all);
if (only) posts = posts.filter((p) => p.slug === only);

if (!posts.length) {
  console.log(only ? `No ready or published post with slug "${only}" that is set for Medium.` : "No ready or published posts to export.");
  process.exit(0);
}

const OUT = path.join(ROOT, "dist", "medium");
const cta = ctaItems(site);
const ctaIntro = "Want the setup behind this? The exact setup lives in the Starter Kit. Follow along and you will see the next one first.";

for (const p of posts) {
  const live = `${site.site_url}/blog/${p.slug}/`;

  const faqMd = p.faqs.length
    ? `\n\n## Questions people ask\n\n${p.faqs.map((f) => `**${f.question}**\n\n${f.answer}`).join("\n\n")}`
    : "";
  const md = `# ${p.title}

${p.summary}

${absolutizeMarkdown(p.body, site.site_url)}${faqMd}

---

${ctaIntro}

${cta.map((c) => `- [${c.label}](${c.url})`).join("\n")}
`;
  writeFile(path.join(OUT, `${p.slug}.md`), md);

  const faqHtml = p.faqs.length
    ? `\n<h2>Questions people ask</h2>\n${p.faqs.map((f) => `<h3>${esc(f.question)}</h3>\n<p>${esc(f.answer)}</p>`).join("\n")}\n`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(p.title)}</title>
</head>
<body>
<article>
<h1>${esc(p.title)}</h1>
<p>${esc(p.summary)}</p>
${absolutizeHtml(renderMarkdown(p.body), site.site_url)}${faqHtml}
<hr>
<p>${esc(ctaIntro)}</p>
<ul>
${cta.map((c) => `<li><a href="${esc(c.url)}">${esc(c.label)}</a></li>`).join("\n")}
</ul>
</article>
</body>
</html>
`;
  writeFile(path.join(OUT, `${p.slug}.html`), html);

  const siteOnlyNote = p.publish_location === "medium"
    ? "\nNOTE: This post is set to Medium only, so it is not on your site. Medium cannot import a canonical link without a live URL. Set Publish location to Both in Notion if you want the import route.\n"
    : "";
  writeFile(path.join(OUT, `README-${p.slug}.txt`), `Medium checklist for: ${p.title}
${siteOnlyNote}
1. Publish on your site first.
   Run npm run build, deploy, then open ${live} and check it loads.

2. In Medium, use "Import a story" and paste the live post URL:
   ${live}
   This keeps the canonical link pointing to your site, which is what you want for search.
   (If import fails, paste dist/medium/${p.slug}.html into a new Medium story instead.
   Then set the canonical link under Story settings > Advanced settings.)

3. Paste the Medium URL back into the "Medium URL" field in Notion.
${p.medium_url ? `   (This post already has a Medium URL on file: ${p.medium_url})\n` : ""}
Files: dist/medium/${p.slug}.md and dist/medium/${p.slug}.html
`);
  console.log(`- ${p.slug}: dist/medium/${p.slug}.md, .html and README-${p.slug}.txt`);
}
