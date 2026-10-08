// npm run new -- "post title"
import fs from "node:fs";
import path from "node:path";
import { POSTS_DIR, slugify, writeFile } from "./lib/util.js";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('Give the post a title: npm run new -- "How do I reply to DMs at 2 AM?"');
  process.exit(1);
}
const slug = slugify(title);
const file = path.join(POSTS_DIR, `${slug}.md`);
if (fs.existsSync(file)) {
  console.error(`content/posts/${slug}.md already exists. Pick a different title or edit that file.`);
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const q = (s) => JSON.stringify(s);

writeFile(file, `---
title: ${q(title)}
slug: ${slug}
question: ${q(title)}
summary: "[Write the direct answer here in 2 to 3 sentences. Readers and search engines see this first.]"
date: ${today}
updated: ${today}
tags: []
status: draft
source_post: ""
medium_url: ""
publish_location: both
faqs: []
# faqs:
#   - question: "A follow-up question readers ask?"
#     answer: "A short, plain answer."
---

[Open with a stance, a scene or a tangent. No warm-up.]

## [Section that explains the answer]

[Tie the idea to one real scene. Use only examples that are real. If you need one: CHINENYE: add real example here]

## The steps

1. [Step one]
2. [Step two]
3. [Step three]

[One line of your own before the call-to-action. End on your view, not a recap.]
`);
console.log(`Created content/posts/${slug}.md (status: draft). Fill it in, then set status to ready.`);
