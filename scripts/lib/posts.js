import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { POSTS_DIR, slugify, toISODate, readingTime } from "./util.js";

export const BUILD_STATUSES = ["ready", "published"];

function asList(value) {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function asFaqs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((f) => ({
      question: String(f?.question ?? f?.q ?? "").trim(),
      answer: String(f?.answer ?? f?.a ?? "").trim(),
    }))
    .filter((f) => f.question && f.answer);
}

/**
 * Read every markdown file in content/posts.
 * Returns { posts, errors }. Each post: { file, slug, title, question, summary, date, updated,
 * tags, status, source_post, medium_url, publish_location, faqs, body, reading_time, ... }
 */
export function loadAllPosts() {
  const errors = [];
  const posts = [];
  if (!fs.existsSync(POSTS_DIR)) return { posts, errors };
  const seen = new Map();

  for (const name of fs.readdirSync(POSTS_DIR).filter((n) => n.endsWith(".md")).sort()) {
    const file = path.join(POSTS_DIR, name);
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const problems = [];
    const slug = String(data.slug || name.replace(/\.md$/, "")).trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) problems.push(`slug "${slug}" must be lowercase letters, numbers and hyphens`);
    if (!data.title) problems.push("missing title");
    if (!data.summary) problems.push("missing summary");
    const date = toISODate(data.date);
    if (!date) problems.push("date must look like 2026-10-08");
    const updated = toISODate(data.updated) || date;
    const status = String(data.status || "draft").toLowerCase();
    if (!["draft", "ready", "published"].includes(status)) problems.push(`status "${status}" must be draft, ready or published`);
    if (seen.has(slug)) problems.push(`slug already used by ${seen.get(slug)}`);
    seen.set(slug, name);

    if (problems.length) {
      errors.push({ file: name, status, problems });
      continue;
    }
    posts.push({
      file,
      filename: name,
      slug,
      title: String(data.title).trim(),
      question: String(data.question || "").trim(),
      summary: String(data.summary).trim(),
      date,
      updated,
      tags: asList(data.tags),
      status,
      source_post: String(data.source_post || "").trim(),
      medium_url: String(data.medium_url || "").trim(),
      publish_location: String(data.publish_location || "").trim().toLowerCase(),
      image: String(data.image || "").trim(),
      notion_id: String(data.notion_id || "").trim(),
      faqs: asFaqs(data.faqs),
      body: content.trim(),
      reading_time: readingTime(content),
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
  return { posts, errors };
}

/** Posts that appear on the site. publish_location "medium" means Medium only, so not built here. */
export function sitePosts(all, { includeDrafts = false } = {}) {
  return all.filter((p) => (includeDrafts || BUILD_STATUSES.includes(p.status)) && p.publish_location !== "medium");
}

/** Posts that are exported for Medium (location Medium or Both, or unset). */
export function mediumPosts(all) {
  return all.filter((p) => BUILD_STATUSES.includes(p.status) && p.publish_location !== "site");
}

export function tagSlug(tag) {
  return slugify(tag);
}
