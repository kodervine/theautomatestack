// Builds the template-driven pages: home, Starter Kit, Freebies, one lesson page per AutoStack Setup, and the shared before-you-go community upsell page (draft preview only).
// The other pages (dm-automation, services, blueprint) are hand-written HTML in public/.
import fs from "node:fs";
import path from "node:path";
import { ROOT, PUBLIC, writeFile, esc } from "./util.js";
import { renderPage, renderPartial } from "./template.js";
import { ctaItems, navMarkup, setSetupNav, socialLinks, jsonLdScripts } from "./render.js";

export function readFreebies() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "freebies.json"), "utf8")).freebies;
}

export function readStarterKit() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "starter-kit.json"), "utf8"));
}

export function readSetupsConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "setups.json"), "utf8"));
}

/** ready = live (needs a video and a Selar link). draft = built only in the draft preview. */
function visibleSetups(cfg, drafts) {
  const setups = cfg.setups;
  for (const s of setups) {
    if (s.status === "ready") {
      const missing = ["video_url", "buy_url"].filter((k) => !s[k]);
      if (missing.length) throw new Error(`Setup "${s.slug}" is marked ready but has no ${missing.join(" or ")} in config/setups.json, so it will not build.`);
    }
  }
  return setups.filter((s) => s.status === "ready" || (drafts && s.status === "draft"));
}

/** Real messages and voice notes from class attendees (names blurred). Config lives in config/reviews.json. */
export function readReviews() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "reviews.json"), "utf8"));
}

function reviewsHtml(cfg, ids) {
  const figs = (ids || []).map((id) => {
    const r = cfg.items[id];
    if (!r) throw new Error(`reviews.json has no item "${id}".`);
    const media = r.type === "video"
      ? `<video controls playsinline preload="none" poster="${esc(r.poster)}" width="${r.width}" height="${r.height}" aria-label="${esc(r.label)}"><source src="${esc(r.src)}" type="video/mp4"></video>`
      : `<img src="${esc(r.src)}" width="${r.width}" height="${r.height}" alt="${esc(r.alt)}" loading="lazy">`;
    const quote = r.quote ? `<q>${esc(r.quote)}</q>` : "";
    return `<figure class="proof-item${r.layout === "card" ? " proof-item--card" : ""}">${media}<figcaption>${quote}<span>${esc(r.who)}</span></figcaption></figure>`;
  });
  if (!figs.length) return "";
  return `<div class="proof-list">${figs.join("")}</div>`;
}

function videoHtml(s) {
  if (s.video_url) {
    return `<div class="video-single"><video controls playsinline preload="metadata" aria-label="${esc(s.short_name)}: the setup working, start to finish"><source src="${esc(s.video_url)}" type="video/mp4"></video></div>`;
  }
  // Only reachable in the draft preview: a ready setup cannot build without a video.
  return `<div class="video-placeholder">Demo video goes here. Add video_url in config/setups.json.</div>`;
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

  const kit = readStarterKit();
  const reviewsCfg = readReviews();
  const kitFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: kit.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  const setupCfg = readSetupsConfig();
  const setups = visibleSetups(setupCfg, drafts);
  const setupPurchaseValue = Number(String(setupCfg.price).replace(/[^0-9]/g, "")) || 0;
  setSetupNav(setups.filter((s) => s.status === "ready").map((s) => ({ url: `/setups/${s.slug}/`, label: s.short_name, note: "One job done for " + setupCfg.price })));
  // "<" is escaped so the JSON can sit safely inside a script tag.
  const setupNamesJson = JSON.stringify(Object.fromEntries(setups.map((s) => [s.slug, s.name]))).replace(/</g, "\\u003c");
  const setupNotionJson = JSON.stringify(Object.fromEntries(setups.filter((s) => /^https:\/\//.test(s.notion_url || "")).map((s) => [s.slug, s.notion_url]))).replace(/</g, "\\u003c");
  const pages = [
    {
      path: "/",
      template: "pages/home.html",
      title: `${site.publisher_name} | AI setups, automation and consulting`,
      description: "I teach non-technical business owners and creators to connect AI to the tools they already use. Start with the free Checklist, then pick the Starter Kit, the Blueprint or a consultation.",
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
      layout: "base-sales.html",
      title: `The AutoStack Starter Kit | ${site.publisher_name}`,
      description: "36 ready-to-run AI setups for your content, inbox, DMs and video editing, with prompts, a test checklist and community access.",
      jsonld: jsonLdScripts(kitFaqSchema),
      extra: { faqs: kit.faqs.map((f, i) => ({ ...f, open: i === 0 ? " open" : "" })), header_note: "The AutoStack Starter Kit", trust: [], buy_href: site.starter_kit_url, pixel_json: JSON.stringify({ content_ids: ["starter-kit"], content_name: "AutoStack Starter Kit", content_type: "product" }).replace(/</g, "\u003c"), reviews_title: reviewsCfg.title, reviews_intro: reviewsCfg.intro, reviews_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_top), reviews_more_title: reviewsCfg.more_title, reviews_more_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_more), reviews_community_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_community) },
    },
    ...setups.map((s) => ({
      path: `/setups/${s.slug}/`,
      template: "pages/setup.html",
      layout: "base-sales.html",
      title: `${s.name} | ${site.publisher_name}`,
      description: s.lead,
      jsonld: jsonLdScripts({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
      }),
      extra: {
        ...s,
        trust: s.trust.map((label) => ({ label })),
        price: setupCfg.price,
        header_note: `${s.short_name} \u00b7 ${setupCfg.price} one time`,
        buy_href: s.buy_url || "#",
        video_html: videoHtml(s),
        faqs: s.faqs.map((f, i) => ({ ...f, open: i === 0 ? " open" : "" })),
        reviews_title: reviewsCfg.title,
        reviews_intro: reviewsCfg.intro,
        reviews_html: reviewsHtml(reviewsCfg, s.review_ids),
        purchase_value: Number(String(setupCfg.price).replace(/[^0-9]/g, "")) || 0,
        pixel_json: JSON.stringify({ content_ids: [s.slug], content_name: s.short_name, content_type: "product", value: Number(String(setupCfg.price).replace(/[^0-9]/g, "")) || 0, currency: "NGN" }).replace(/</g, "\\u003c"),
      },
    })),
    // Draft for now: the Club upsell is built only in the draft preview until the founding buyers are in.
    ...(drafts ? [{
      path: "/before-you-go/",
      template: "pages/before-you-go.html",
      layout: "base-sales.html",
      title: `Before you go | ${site.publisher_name}`,
      description: "One more step: join the AutoStack community, from The Automate Stack.",
      noindex: true,
      extra: {
        ...setupCfg.club,
        trust: ["Secure payment", "Instant access"].map((label) => ({ label })),
        header_note: `${setupCfg.club.name} · ${setupCfg.club.price} ${setupCfg.club.price_note}`,
        buy_href: setupCfg.club.buy_url || "#",
        annual_buy_href: setupCfg.club.annual_buy_url || "#",
        setup_names_json: setupNamesJson,
        purchase_value: Number(String(setupCfg.price).replace(/[^0-9]/g, "")) || 0,
        pixel_json: "{}",
        setup_notion_json: setupNotionJson,
      },
    }] : []),
    {
      path: "/privacy/",
      template: "pages/privacy.html",
      title: `Privacy note | ${site.publisher_name}`,
      description: "What The Automate Stack collects, why, and how to ask for it to be deleted. Short and plain.",
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
      pixel_json: "{}",
      purchase_value: setupPurchaseValue,
      ...(pg.extra || {}),
      nav_desktop: navMarkup(pg.path === "/" ? "/__home__" : pg.path, posts.length > 0).desktop,
      nav_mobile: navMarkup(pg.path === "/" ? "/__home__" : pg.path, posts.length > 0).mobile,
      page_title: pg.title,
      og_title: pg.title,
      description: pg.description,
      canonical: `${site.site_url}${pg.canonicalPath || pg.path}`,
      jsonld: pg.jsonld || "",
      robots: pg.noindex ? "noindex, nofollow" : base.robots,
    }, pg.layout);
    writeFile(pg.file ? path.join(out, pg.file) : path.join(out, pg.path.slice(1), "index.html"), html);
    return { path: pg.path, title: pg.title, description: pg.description, indexable: !pg.noindex };
  });
}

const PIXEL_BLOCK = /\n?<!-- meta-pixel:start -->[\s\S]*?<!-- meta-pixel:end -->\n?/g;
const NOTICE_BLOCK = /\n?<!-- meta-notice:start -->[\s\S]*?<!-- meta-notice:end -->\n?/g;

/**
 * The pages written by hand (no shared template) get the same Pixel and tracking notice, between markers,
 * so the one Pixel ID in config/site.json is the only place to change. Runs only for the real build.
 * With no ID set it removes the blocks again.
 */
export function injectIntoHandWrittenPages(site) {
  const on = Boolean(site.meta_pixel_id);
  const pixel = on ? renderPartial("meta-pixel", { meta_pixel_id: site.meta_pixel_id, pixel_json: "{}", purchase_value: 0 }).trim() : "";
  const reg = site.registration_line ? '<p class="text-center text-[11px] text-muted-stone pt-4 px-6">' + site.registration_line + "</p>" : "";
  const pix = on ? '<p class="text-center text-[11px] text-muted-stone py-4 px-6">This site uses the Meta Pixel to measure my ads. It saves cookies on your device. See the <a href="/privacy/" class="underline">privacy note</a> for what it records and how to opt out.</p>' : "";
  const notice = [reg, pix].filter(Boolean).join("\n");
  const changed = [];
  for (const d of fs.readdirSync(PUBLIC, { withFileTypes: true })) {
    if (!d.isDirectory() || ["blog", "assets", "api"].includes(d.name) || d.name.startsWith(".")) continue;
    const file = path.join(PUBLIC, d.name, "index.html");
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    if (before.includes('class="skip-link"')) continue; // generated page, already handled by the layout
    let h = before.replace(PIXEL_BLOCK, "").replace(NOTICE_BLOCK, "");
    if (on) h = h.replace("</head>", () => "<!-- meta-pixel:start -->\n" + pixel + "\n<!-- meta-pixel:end -->\n</head>");
    if (notice) {
      const i = h.lastIndexOf("</footer>");
      if (i > -1) h = h.slice(0, i) + "<!-- meta-notice:start -->\n" + notice + "\n<!-- meta-notice:end -->\n" + h.slice(i);
    }
    if (h !== before) { fs.writeFileSync(file, h); changed.push("/" + d.name + "/"); }
  }
  return changed;
}
