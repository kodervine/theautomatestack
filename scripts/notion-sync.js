// npm run sync [-- slug] [-- --force]
// Pulls rows from the Notion "Blog Posts" database where Status = Ready and writes content/posts/<slug>.md.
// Your text is copied exactly as written. A post you edited locally is never overwritten without asking (or --force).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { POSTS_DIR, slugify, toISODate, writeFile } from "./lib/util.js";
import { getClient, queryAllRows, readProp, parseFaqs, pageToMarkdown } from "./lib/notion.js";
import { loadState, saveState, hashText, confirm } from "./lib/sync-state.js";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.find((a) => !a.startsWith("--"));

const notion = getClient();
const state = loadState();

console.log("Reading the Blog Posts database...");
const rows = (await queryAllRows(notion)).filter((r) => String(readProp(r, "Status")).toLowerCase() === "ready");
console.log(`Found ${rows.length} row(s) with Status = Ready.`);

let written = 0;
for (const page of rows) {
  const title = readProp(page, "Title");
  const slug = slugify(readProp(page, "Slug") || title);
  if (!slug) { console.log(`- Skipped a row with no title or slug (${page.id}).`); continue; }
  if (only && only !== slug) continue;

  const file = path.join(POSTS_DIR, `${slug}.md`);
  const prev = state[slug];
  const exists = fs.existsSync(file);

  if (exists && !force) {
    const current = fs.readFileSync(file, "utf8");
    const editedLocally = !prev || hashText(current) !== prev.hash;
    if (editedLocally) {
      const ok = await confirm(`"${slug}" was edited on this computer. Overwrite it with the Notion version?`);
      if (!ok) { console.log(`- Kept your local version of ${slug}. (Use --force to overwrite.)`); continue; }
    } else if (prev.last_edited === page.last_edited_time) {
      console.log(`- ${slug}: already up to date.`);
      continue;
    }
  }

  const { markdown, warnings } = await pageToMarkdown(notion, page.id, slug);
  const { faqs, bad } = parseFaqs(readProp(page, "FAQs"));
  const tags = readProp(page, "Tags");
  const data = {
    title,
    slug,
    question: readProp(page, "Question"),
    summary: readProp(page, "Summary"),
    date: toISODate(readProp(page, "Date")) || page.created_time.slice(0, 10),
    updated: page.last_edited_time.slice(0, 10),
    tags: Array.isArray(tags) ? tags : [],
    status: "ready",
    source_post: readProp(page, "Source post"),
    medium_url: readProp(page, "Medium URL"),
    publish_location: String(readProp(page, "Publish location")).toLowerCase() || "both",
    faqs,
    notion_id: page.id,
  };
  const out = matter.stringify(markdown, data);
  writeFile(file, out);
  state[slug] = { notion_id: page.id, last_edited: page.last_edited_time, hash: hashText(out) };
  saveState(state);
  written += 1;

  console.log(`- ${slug}: written.`);
  if (!data.summary) console.log(`  ! No Summary in Notion. The build needs one before this post can go live.`);
  if (!data.question) console.log(`  ! No Question in Notion.`);
  for (const l of bad) console.log(`  ! FAQ line skipped (use "Question | Answer"): ${l}`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

console.log(`\nDone. ${written} post(s) written. Next: npm run build`);
