// npm run draft -- "slug" [--force]
// Reads the row's Source post and Question, writes an answer-first draft in Chinenye's voice (using
// .claude/skills/chinenye-voice/SKILL.md) with Gemini, saves it to the page body and sets Status = Draft.
// It never sets Ready or Published, and never touches a page that already has a body unless you pass --force.
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { ROOT, requireEnv, slugify } from "./lib/util.js";
import {
  getClient, queryAllRows, readProp, setStatus, setText, findProp,
  pageHasBody, clearBody, markdownToBlocks, appendBlocks,
} from "./lib/notion.js";

const args = process.argv.slice(2);
const force = args.includes("--force");
const slug = slugify(args.find((a) => !a.startsWith("--")) || "");
if (!slug) {
  console.error('Tell me which row: npm run draft -- "your-post-slug"');
  process.exit(1);
}
requireEnv("GEMINI_API_KEY");

const skillPath = path.join(ROOT, ".claude", "skills", "chinenye-voice", "SKILL.md");
if (!fs.existsSync(skillPath)) {
  console.error("Cannot find .claude/skills/chinenye-voice/SKILL.md. I will not draft without the voice skill.");
  process.exit(1);
}
const voice = fs.readFileSync(skillPath, "utf8").replace(/^---[\s\S]*?---\s*/, "");

const notion = getClient();
const rows = await queryAllRows(notion);
const page = rows.find((r) => slugify(readProp(r, "Slug") || readProp(r, "Title")) === slug);
if (!page) {
  console.error(`No row with Slug "${slug}" in the Blog Posts database.`);
  process.exit(1);
}

const title = readProp(page, "Title");
const question = readProp(page, "Question") || title;
const source = readProp(page, "Source post");
const existingSummary = readProp(page, "Summary");
const status = String(readProp(page, "Status")).toLowerCase();

if (!source) {
  console.error('That row has no "Source post". Paste the carousel or reel text into that field first.');
  process.exit(1);
}
if (/^https?:\/\/\S+$/.test(source)) {
  console.error('"Source post" is only a link. I cannot read Instagram or TikTok, so paste the actual script or slide text into that field.');
  process.exit(1);
}
if (["ready", "published"].includes(status) && !force) {
  console.error(`That row is already ${status}. I will not turn it back into a draft unless you pass --force.`);
  process.exit(1);
}
if ((await pageHasBody(notion, page.id)) && !force) {
  console.error("That page already has content. I will not replace it unless you pass --force.");
  process.exit(1);
}

const system = `${voice}

---
You are drafting one blog post for Chinenye's site. Follow the voice rules above exactly.

Return JSON with two fields:
- "summary": the direct answer to the question in 2 to 3 plain sentences. ${existingSummary ? "Chinenye already wrote one, keep it consistent with it." : ""}
- "body": the article in markdown. Do NOT repeat the summary and do NOT include a title. Open with a stance, a scene or a tangent, no warm-up. Then the story in her voice, then numbered steps under a "## The steps" heading, then one closing line of her own. Use "##" for section headings. 600 to 900 words.

Hard rules:
- Use only facts found in the source material below. Never invent personal stories, results, numbers, names or amounts.
- Where a real example would help, write exactly: [CHINENYE: add real example here]
- No em dashes, no exclamation marks, no corporate filler.
- Do not write a call-to-action. The site adds it.`;

const prompt = `Question the post answers: ${question}
Working title: ${title}
${existingSummary ? `Existing summary (keep consistent): ${existingSummary}\n` : ""}
Source post (carousel or reel text):
"""
${source}
"""`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
console.log(`Drafting "${title}" with ${model}...`);

let result;
try {
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature: 0.8,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { summary: { type: "string" }, body: { type: "string" } },
        required: ["summary", "body"],
      },
    },
  });
  result = JSON.parse(res.text);
} catch (err) {
  console.error(`Gemini did not return a usable draft: ${err.message}`);
  process.exit(1);
}

// Mechanical clean-up of rules the model sometimes breaks.
const clean = (s) => s.replace(/\s*[—–]\s*/g, ", ").replace(/!/g, ".").trim();
const body = clean(result.body);
const summary = clean(result.summary);
const words = body.split(/\s+/).length;

if (force) await clearBody(notion, page.id);
await appendBlocks(notion, page.id, markdownToBlocks(body));
await setStatus(notion, page, "Status", "Draft");
if (!existingSummary && findProp(page, "Summary")) await setText(notion, page, "Summary", summary);

console.log(`\nSaved a ${words}-word draft to the page body. Status = Draft.`);
if (!existingSummary) console.log("Summary was empty, so I filled it in. Check it.");
console.log("Read it, add your real examples where you see [CHINENYE: ...], then set Status = Ready yourself.");
