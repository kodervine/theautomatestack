// Builds the template-driven pages: home, Starter Kit, Freebies and one thank-you page per freebie.
// The other pages (dm-automation, services, blueprint) are hand-written HTML in public/.
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeFile } from "./util.js";
import { renderPage } from "./template.js";
import { ctaItems, navItems, socialLinks, jsonLdScripts } from "./render.js";

export function readFreebies() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "freebies.json"), "utf8")).freebies;
}

export function buildPages({ out, site, posts, drafts }) {
  const freebies = readFreebies();
  const ogImage = `${site.site_url}${site.default_og_image}`;
  const base = {
    ...site,
    year: new Date().getFullYear(),
    cta_items: ctaItems(site),
    draft_banner: false,
    has_blog: posts.length > 0,
    og_type: "website",
    og_image: ogImage,
    prev_next_links: "",
    article_meta: "",
    jsonld: "",
    robots: drafts ? "noindex, nofollow" : "",
  };

  const latest = posts.slice(0, 3).map((p) => ({ url: `/blog/${p.slug}/`, title: p.title, summary: p.summary }));
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.publisher_name,
    url: `${site.site_url}/`,
    logo: `${site.site_url}${site.logo_path}`,
    sameAs: socialLinks(site),
  };

  const pages = [
    {
      path: "/",
      template: "pages/home.html",
      title: `${site.publisher_name} | AI setups, automation and consulting`,
      description: "Practical AI setups and automation for your content, inbox and DMs. Start with the free Checklist, then pick the Starter Kit, the Blueprint or a consultation.",
      jsonld: jsonLdScripts(org, { "@context": "https://schema.org", "@type": "WebSite", name: site.publisher_name, url: `${site.site_url}/` }),
      extra: { latest },
    },
    {
      path: "/freebies/",
      template: "pages/freebies.html",
      title: `Free resources | ${site.publisher_name}`,
      description: "Free resources from The Automate Stack. Start with the AutoStack Checklist and get your lost hours back.",
      extra: { freebies },
    },
    {
      path: "/starter-kit/",
      template: "pages/starter-kit.html",
      title: `The AutoStack Starter Kit | ${site.publisher_name}`,
      description: "36 ready-to-run AI setups for your content, inbox, DMs and video editing, with prompts, a test checklist and community access.",
    },
    {
      path: "/404/",
      file: "404.html",
      template: "pages/404.html",
      title: `Page not found | ${site.publisher_name}`,
      description: "This page could not be found.",
      noindex: true,
      canonicalPath: "/",
    },
  ];

  return pages.map((pg) => {
    const html = renderPage(pg.template, {
      ...base,
      ...(pg.extra || {}),
      nav: navItems(pg.path === "/" ? "/__home__" : pg.path, posts.length > 0),
      page_title: pg.title,
      og_title: pg.title,
      description: pg.description,
      canonical: `${site.site_url}${pg.canonicalPath || pg.path}`,
      jsonld: pg.jsonld || "",
      robots: pg.noindex ? "noindex, nofollow" : base.robots,
    });
    writeFile(pg.file ? path.join(out, pg.file) : path.join(out, pg.path.slice(1), "index.html"), html);
    return { path: pg.path, title: pg.title, description: pg.description, indexable: !pg.noindex };
  });
}
