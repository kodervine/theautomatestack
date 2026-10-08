// Shared Notion helpers: client, property readers, blocks <-> markdown.
import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import { PUBLIC, requireEnv, slugify } from "./util.js";

export function getClient() {
  requireEnv("NOTION_TOKEN");
  return new Client({ auth: process.env.NOTION_TOKEN });
}

/** The API now queries a "data source". Use NOTION_DATA_SOURCE_ID, or look it up from the database ID. */
export async function getDataSourceId(notion) {
  if (process.env.NOTION_DATA_SOURCE_ID) return process.env.NOTION_DATA_SOURCE_ID;
  requireEnv("NOTION_DATABASE_ID");
  const db = await notion.databases.retrieve({ database_id: process.env.NOTION_DATABASE_ID });
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Could not find a data source for that database. Set NOTION_DATA_SOURCE_ID in .env.");
  return ds.id;
}

export async function queryAllRows(notion) {
  const data_source_id = await getDataSourceId(notion);
  const rows = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id, start_cursor: cursor, page_size: 100 });
    rows.push(...res.results.filter((r) => r.object === "page"));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

// ---------- properties ----------

export function findProp(page, name) {
  const key = Object.keys(page.properties).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  return key ? { key, prop: page.properties[key] } : null;
}

const plain = (arr = []) => arr.map((t) => t.plain_text).join("");

/** Read any property as text (or an array for multi-select). Returns "" when empty. */
export function readProp(page, name) {
  const found = findProp(page, name);
  if (!found) return "";
  const p = found.prop;
  switch (p.type) {
    case "title": return plain(p.title).trim();
    case "rich_text": return plain(p.rich_text).trim();
    case "url": return p.url || "";
    case "email": return p.email || "";
    case "select": return p.select?.name || "";
    case "status": return p.status?.name || "";
    case "multi_select": return p.multi_select.map((o) => o.name);
    case "date": return p.date?.start || "";
    case "number": return p.number ?? "";
    case "formula": return p.formula?.string ?? "";
    case "files": return p.files?.[0]?.external?.url || p.files?.[0]?.file?.url || "";
    default: return "";
  }
}

/** Set a Status/Select property by option name. */
export async function setStatus(notion, page, name, value) {
  const found = findProp(page, name);
  if (!found) throw new Error(`The database has no "${name}" property.`);
  const type = found.prop.type;
  if (type !== "status" && type !== "select") throw new Error(`"${name}" is a ${type} property, expected Status or Select.`);
  await notion.pages.update({ page_id: page.id, properties: { [found.key]: { [type]: { name: value } } } });
}

export async function setText(notion, page, name, value) {
  const found = findProp(page, name);
  if (!found || found.prop.type !== "rich_text") return false;
  await notion.pages.update({ page_id: page.id, properties: { [found.key]: { rich_text: textToRichText(value) } } });
  return true;
}

export function parseFaqs(text) {
  const faqs = [];
  const bad = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf("|");
    if (i < 0) { bad.push(line.trim()); continue; }
    const question = line.slice(0, i).trim();
    const answer = line.slice(i + 1).trim();
    if (question && answer) faqs.push({ question, answer }); else bad.push(line.trim());
  }
  return { faqs, bad };
}

// ---------- blocks to markdown ----------

async function listChildren(notion, id) {
  const out = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: id, start_cursor: cursor, page_size: 100 });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

export async function fetchTree(notion, id) {
  const blocks = await listChildren(notion, id);
  for (const b of blocks) {
    if (b.has_children) b.children = await fetchTree(notion, b.id);
  }
  return blocks;
}

export function richTextToMd(rich = []) {
  return rich
    .map((t) => {
      let s = t.plain_text.replace(/\n/g, "  \n");
      if (!s) return "";
      const a = t.annotations || {};
      const lead = s.match(/^\s*/)[0];
      const trail = s.match(/\s*$/)[0];
      let core = s.slice(lead.length, s.length - trail.length);
      if (!core) return s;
      if (a.code) core = `\`${core}\``;
      if (a.bold) core = `**${core}**`;
      if (a.italic) core = `*${core}*`;
      if (a.strikethrough) core = `~~${core}~~`;
      const href = t.href || t.text?.link?.url;
      if (href) core = `[${core}](${href})`;
      return lead + core + trail;
    })
    .join("");
}

function minHeadingLevel(blocks, min = 4) {
  for (const b of blocks) {
    const m = /^heading_(\d)$/.exec(b.type);
    if (m) min = Math.min(min, Number(m[1]));
    if (b.children) min = minHeadingLevel(b.children, min);
  }
  return min;
}

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg", "image/avif": ".avif" };

async function downloadImage(url, ctx) {
  ctx.imageCount += 1;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0];
  let ext = EXT[type] || path.extname(new URL(url).pathname).toLowerCase();
  if (!ext || ext.length > 5) ext = ".jpg";
  const name = `${ctx.imageCount}-${slugify(path.basename(new URL(url).pathname, path.extname(new URL(url).pathname))).slice(0, 40) || "image"}${ext}`;
  fs.mkdirSync(ctx.imageDir, { recursive: true });
  fs.writeFileSync(path.join(ctx.imageDir, name), Buffer.from(await res.arrayBuffer()));
  return `/blog/images/${ctx.slug}/${name}`;
}

const indent = (text, pad) => text.split("\n").map((l) => (l ? pad + l : l)).join("\n");
const quote = (text) => text.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n");

async function renderBlocks(blocks, ctx) {
  const parts = [];
  let numbered = 0;
  for (const b of blocks) {
    numbered = b.type === "numbered_list_item" ? numbered + 1 : 0;
    const text = richTextToMd(b[b.type]?.rich_text);
    const kids = b.children ? await renderBlocks(b.children, ctx) : "";
    let md = "";
    let list = false;
    switch (b.type) {
      case "paragraph": md = text; break;
      case "heading_1": case "heading_2": case "heading_3": {
        const level = Math.min(6, Number(b.type.slice(-1)) + ctx.headingShift);
        md = `${"#".repeat(level)} ${text}`;
        break;
      }
      case "bulleted_list_item": md = `- ${text}` + (kids ? `\n${indent(kids, "    ")}` : ""); list = true; break;
      case "numbered_list_item": md = `${numbered}. ${text}` + (kids ? `\n${indent(kids, "    ")}` : ""); list = true; break;
      case "to_do": md = `- [${b.to_do.checked ? "x" : " "}] ${text}` + (kids ? `\n${indent(kids, "    ")}` : ""); list = true; break;
      case "quote": md = quote([text, kids].filter(Boolean).join("\n\n")); break;
      case "callout": {
        const icon = b.callout.icon?.type === "emoji" ? `${b.callout.icon.emoji} ` : "";
        md = quote([icon + text, kids].filter(Boolean).join("\n\n"));
        break;
      }
      case "code": {
        const lang = b.code.language === "plain text" ? "" : b.code.language;
        const raw = b.code.rich_text.map((t) => t.plain_text).join("");
        md = "```" + lang + "\n" + raw + "\n```";
        break;
      }
      case "divider": md = "---"; break;
      case "image": {
        const src = b.image.type === "external" ? b.image.external.url : b.image.file.url;
        const alt = richTextToMd(b.image.caption).replace(/\n/g, " ");
        try {
          md = `![${alt}](${await downloadImage(src, ctx)})`;
        } catch (err) {
          ctx.warnings.push(`Image ${ctx.imageCount} could not be downloaded (${err.message}). Left the original link in place.`);
          md = `![${alt}](${src})`;
        }
        break;
      }
      case "bookmark": case "embed": case "link_preview": {
        const url = b[b.type].url;
        md = `[${url}](${url})`;
        break;
      }
      case "toggle": md = `<details>\n<summary>${text}</summary>\n\n${kids}\n\n</details>`; break;
      case "table": {
        const rows = (b.children || []).map((r) => r.table_row.cells.map((c) => richTextToMd(c).replace(/\|/g, "\\|")));
        if (rows.length) {
          const head = b.table.has_column_header ? rows.shift() : rows[0].map(() => "");
          md = [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
        }
        break;
      }
      case "column_list": case "column": md = kids; break;
      default:
        ctx.warnings.push(`Skipped a "${b.type}" block (not supported).`);
    }
    if (md !== "") parts.push({ md, list, type: b.type });
  }
  return parts
    .map((p, i) => {
      if (i === 0) return p.md;
      const prev = parts[i - 1];
      const tight = p.list && prev.list && p.type === prev.type;
      return (tight ? "\n" : "\n\n") + p.md;
    })
    .join("");
}

/** Convert a Notion page body to markdown. Images are saved to blog/images/<slug>/. */
export async function pageToMarkdown(notion, pageId, slug) {
  const tree = await fetchTree(notion, pageId);
  const min = minHeadingLevel(tree);
  const ctx = {
    slug,
    imageDir: path.join(PUBLIC, "blog", "images", slug),
    imageCount: 0,
    warnings: [],
    headingShift: min <= 3 ? 2 - min : 0, // smallest heading used becomes h2
  };
  fs.rmSync(ctx.imageDir, { recursive: true, force: true });
  const md = await renderBlocks(tree, ctx);
  return { markdown: md.trim() + "\n", warnings: ctx.warnings };
}

export async function pageHasBody(notion, pageId) {
  const res = await notion.blocks.children.list({ block_id: pageId, page_size: 1 });
  return res.results.length > 0;
}

export async function clearBody(notion, pageId) {
  for (const b of await listChildren(notion, pageId)) await notion.blocks.delete({ block_id: b.id });
}

// ---------- markdown to blocks (used by npm run draft) ----------

function textToRichText(text, annotations = {}, link = null) {
  const out = [];
  for (let i = 0; i < text.length; i += 2000) {
    out.push({ type: "text", text: { content: text.slice(i, i + 2000), link: link ? { url: link } : null }, annotations });
  }
  return out;
}

function inlineToRichText(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(?<![\w*])\*([^*\s][^*]*?)\*(?![\w*])|(?<![\w_])_([^_\s][^_]*?)_(?![\w_])/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...textToRichText(text.slice(last, m.index)));
    if (m[1] !== undefined) out.push(...textToRichText(m[1], { bold: true }));
    else if (m[2] !== undefined) out.push(...textToRichText(m[2], { code: true }));
    else if (m[3] !== undefined) out.push(...textToRichText(m[3], {}, m[4]));
    else out.push(...textToRichText(m[5] ?? m[6], { italic: true }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(...textToRichText(text.slice(last)));
  return out.length ? out : textToRichText(" ");
}

const LANGS = new Set(["javascript", "typescript", "json", "bash", "shell", "python", "html", "css", "sql", "yaml", "markdown", "java", "go", "php"]);

export function markdownToBlocks(md) {
  const blocks = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: inlineToRichText(para.join("\n")) } });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = /^```(\w*)\s*$/.exec(line))) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) code.push(lines[i]);
      const lang = m[1].toLowerCase();
      blocks.push({ object: "block", type: "code", code: { language: LANGS.has(lang) ? lang : "plain text", rich_text: textToRichText(code.join("\n")) } });
    } else if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      flush();
      const type = `heading_${m[1].length}`;
      blocks.push({ object: "block", type, [type]: { rich_text: inlineToRichText(m[2]) } });
    } else if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      flush();
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: inlineToRichText(m[1]) } });
    } else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      flush();
      blocks.push({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: inlineToRichText(m[1]) } });
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flush();
      blocks.push({ object: "block", type: "quote", quote: { rich_text: inlineToRichText(m[1]) } });
    } else if (/^---+\s*$/.test(line)) {
      flush();
      blocks.push({ object: "block", type: "divider", divider: {} });
    } else if (!line.trim()) {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export async function appendBlocks(notion, pageId, blocks) {
  for (let i = 0; i < blocks.length; i += 90) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 90) });
  }
}
