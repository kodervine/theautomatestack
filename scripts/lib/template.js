// Tiny template engine, no dependencies.
//   {{name}}            escaped value
//   {{{name}}}          raw HTML value
//   {{> partial}}       include templates/partials/partial.html
//   {{#if name}}..{{/if}}
//   {{#each list}}..{{/each}}   (inside, item fields win over page fields)
import fs from "node:fs";
import path from "node:path";
import { ROOT, esc } from "./util.js";

const TPL_DIR = path.join(ROOT, "templates");
const cache = new Map();

function load(rel) {
  const file = path.join(TPL_DIR, rel);
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, "utf8"));
  return cache.get(file);
}

export function clearTemplateCache() {
  cache.clear();
}

function get(ctx, key) {
  const v = ctx[key.trim()];
  return v === undefined || v === null ? "" : v;
}

function truthy(v) {
  return Array.isArray(v) ? v.length > 0 : Boolean(v);
}

function renderString(tpl, ctx) {
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => renderString(load(`partials/${name}.html`), ctx));
  out = out.replace(/\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) =>
    truthy(get(ctx, key)) ? renderString(body, ctx) : ""
  );
  out = out.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, body) => {
    const list = get(ctx, key);
    return Array.isArray(list) ? list.map((item) => renderString(body, { ...ctx, ...item })).join("") : "";
  });
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(get(ctx, key)));
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => esc(get(ctx, key)));
  return out;
}

export function renderTemplate(name, ctx) {
  return renderString(load(name), ctx);
}

export function renderPartial(name, ctx) {
  return renderString(load(`partials/${name}.html`), ctx);
}

/** Render a page template inside templates/base.html. */
export function renderPage(templateName, ctx) {
  const content = renderTemplate(templateName, ctx);
  return renderTemplate("base.html", { ...ctx, content });
}
