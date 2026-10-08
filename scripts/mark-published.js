// npm run mark-published
// Offers to set Status = Published in Notion for posts that are live. Run it AFTER you have deployed.
import fs from "node:fs";
import { loadAllPosts } from "./lib/posts.js";
import { getClient, setStatus } from "./lib/notion.js";
import { loadState, saveState, hashText, confirm } from "./lib/sync-state.js";

const { posts } = loadAllPosts();
const candidates = posts.filter((p) => p.status === "ready" && p.notion_id);

if (!candidates.length) {
  console.log("Nothing to mark. No local posts with status ready and a Notion link.");
  process.exit(0);
}

const notion = getClient();
const state = loadState();
console.log("Only say yes for posts that are already live on the site.\n");

for (const p of candidates) {
  if (!(await confirm(`Set "${p.title}" to Published in Notion?`))) continue;
  const page = await notion.pages.retrieve({ page_id: p.notion_id });
  await setStatus(notion, page, "Status", "Published");

  // Keep the local file in step, and tell the sync it was us, not a hand edit.
  const text = fs.readFileSync(p.file, "utf8").replace(/^status:\s*ready\s*$/m, "status: published");
  fs.writeFileSync(p.file, text);
  if (state[p.slug]) state[p.slug].hash = hashText(text);
  saveState(state);
  console.log(`  Done: ${p.slug} is Published.`);
}
