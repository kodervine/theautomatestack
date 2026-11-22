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
  const kit = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "starter-kit.json"), "utf8"));
  // FAQ answers can use {price_now}, {price_was}, {guarantee_bonus}, {guarantee_days}, {partner_per} and {founding_cap}.
  const num = (s) => Number(String(s).replace(/[^0-9]/g, "")) || 0;
  const naira = (n) => "\u20a6" + Number(n).toLocaleString("en-US");
  const tokens = {
    price_now: kit.price_now,
    price_was: kit.price_was,
    guarantee_bonus: kit.guarantee_bonus,
    guarantee_days: kit.guarantee_days,
    founding_cap: kit.founding_cap,
    community_yearly: naira((kit.stack.bonuses.find((b) => b.community) || {}).value || 0),
    partner_per: naira(Math.round((num(kit.price_now) * (Number(kit.partner_pct) || 0)) / 100)),
  };
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in tokens ? tokens[k] : m));
  kit.faqs = (kit.faqs || []).map((f) => ({ question: fill(f.question), answer: fill(f.answer) }));
  return kit;
}

/** The Organization JSON-LD block, put on every page so each one names the same entity. */
export function orgSchema(site) {
  const pos = readPositioning();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.site_url}/#organization`,
    name: site.publisher_name,
    url: `${site.site_url}/`,
    logo: `${site.site_url}${site.logo_path}`,
    description: pos.entity_statement,
    knowsAbout: pos.knows_about,
    founder: { "@type": "Person", name: site.founder_name || site.author_full_name },
    areaServed: ["Nigeria", "Africa", "Worldwide"],
    sameAs: socialLinks(site),
  };
}

/** Entity statement, the four service pillars and the buyer FAQs for the home page and the Organization schema. */
export function readPositioning() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "positioning.json"), "utf8"));
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
    return `<figure class="proof-item${r.layout === "card" ? " proof-item--card" : ""}">${media}<figcaption>${quote}${r.note ? `<p class="proof-note">${esc(r.note)}</p>` : ""}<span>${esc(r.who)}</span></figcaption></figure>`;
  });
  if (!figs.length) return "";
  // A run of cards sits two across. If the run is odd, the last card is centred on its own.
  let run = 0;
  figs.forEach((f, i) => {
    if (f.includes("proof-item--card")) run++;
    else run = 0;
    const last = i === figs.length - 1 || !figs[i + 1].includes("proof-item--card");
    if (f.includes("proof-item--card") && last && run % 2 === 1) figs[i] = f.replace("proof-item--card", "proof-item--card proof-item--solo");
  });
  return `<div class="proof-list">${figs.join("")}</div>`;
}

/** The offer: what the kit is, then each bonus in its own block with its worth. Numbers and text come from config/starter-kit.json. */
function stackHtml(kit, spotsLeft, taken, cap) {
  const money = (n) => "\u20a6" + Number(n).toLocaleString("en-US");
  const bonuses = (kit.stack.bonuses || []).filter((b) => !b.only_while_spots || spotsLeft > 0);
  const total = bonuses.reduce((sum, b) => sum + (typeof b.value === "number" ? b.value : 0), 0);
  const blocks = bonuses.map((b, i) => {
    const scarcity = b.only_while_spots ? " Only for the first " + cap + " founding members. " + taken + " of " + cap + " spots are gone. " + spotsLeft + " left. When they are gone, they are gone." : "";
    const value = typeof b.value === "number" ? money(b.value) : esc(b.value);
    const per = Math.round((Number(String(kit.price_now).replace(/[^0-9]/g, "")) * (Number(kit.partner_pct) || 0)) / 100);
    const n = per ? Math.ceil(Number(String(kit.price_now).replace(/[^0-9]/g, "")) / per) : 0;
    const partner = b.partner_math && per ? " At today's price, each person you introduce earns you " + money(per) + ". Say you introduce " + n + " business owners. That is " + money(per * n) + " back, more than you paid for the kit." : "";
    return `<div class="bonus-card"><p class="bonus-label">Bonus ${i + 1}</p><h3>${esc(b.title)}</h3><p>${esc(b.text)}${esc(partner)}${esc(scarcity)}</p><p class="bonus-value">Worth ${value}${b.value_note ? " " + esc(b.value_note) : ""}. Yours free.</p></div>`;
  }).join("");
  return `<p class="core-line"><strong>The AutoStack Starter Kit.</strong> ${esc(kit.core)}</p><h3 class="bonus-heading">You are getting in early, so you get these on top. Free.</h3>${blocks}<div class="bonus-total"><p>Add it up. The bonuses alone are worth <strong>${money(total)}</strong>.</p><p>You are not paying ${money(total)}. You are not even paying the regular ${esc(kit.price_was)} for the kit.</p><p>Today, as a founding member, you pay just <strong>${esc(kit.price_now)}</strong>. The kit and every bonus.</p></div>`;
}

/** The closing recap: the kit and every bonus again, with its worth, right before the buy button. */
function recapHtml(kit, spotsLeft) {
  const money = (n) => "\u20a6" + Number(n).toLocaleString("en-US");
  const bonuses = (kit.stack.bonuses || []).filter((b) => !b.only_while_spots || spotsLeft > 0);
  const total = bonuses.reduce((sum, b) => sum + (typeof b.value === "number" ? b.value : 0), 0);
  const li = bonuses.map((b, i) => {
    const worth = typeof b.value === "number" ? money(b.value) : esc(b.value);
    const only = b.only_while_spots ? ", first 20 founding members only" : "";
    return `<li><strong>Bonus ${i + 1}:</strong> ${esc(b.short || b.title)} <span>(worth ${worth}${b.value_note ? " " + esc(b.value_note) : ""}${only})</span></li>`;
  }).join("");
  return `<div class="recap"><p class="recap-title">Here is what you get today:</p><ul class="tick-list"><li><strong>The AutoStack Starter Kit</strong> with all 36 setups</li>${li}</ul><p class="recap-total">${money(total)} in bonuses. Yours free.</p></div>`;
}

function videoHtml(s) {
  if (s.video_url) {
    return `<div class="video-single"><video controls playsinline preload="metadata" aria-label="${esc(s.short_name)}: the setup working, start to finish"><source src="${esc(s.video_url)}" type="video/mp4"></video></div>`;
  }
  // Only reachable in the draft preview: a ready setup cannot build without a video.
  return `<div class="video-placeholder">Demo video goes here. Add video_url in config/setups.json.</div>`;
}

/**
 * The cold-traffic masterclass replay: a sales page and a thank-you page (config/replay.json).
 * ready = live (needs the Selar link, the replay, the refund text and the result media). draft = built only in the draft preview.
 */
function replayEntries({ site, drafts }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "replay.json"), "utf8"));
  if (cfg.status !== "ready" && !drafts) return [];
  if (cfg.status === "ready") {
    const missing = [["buy_url", cfg.buy_url], ["replay_url", cfg.replay_url || cfg.replay_embed_url], ["refund", cfg.refund], ["result_media.src", cfg.result_media && cfg.result_media.src]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`The replay pages are marked ready but config/replay.json has no ${missing.join(", ")}, so they will not build.`);
  }
  const hole = (what) => `[CHINENYE: add ${what}]`;
  const m = cfg.result_media || {};
  const price = Number(String(cfg.price).replace(/[^0-9]/g, "")) || 0;
  const priceLine = cfg.price + (cfg.price_usd ? ` (about ${cfg.price_usd})` : "") + ", one time";
  const result_html = m.src
    ? (m.type === "video"
      ? `<div class="result-media"><video controls playsinline preload="metadata"${m.poster ? ` poster="${esc(m.poster)}"` : ""} aria-label="${esc(m.alt)}"><source src="${esc(m.src)}" type="video/mp4"></video></div>`
      : `<div class="result-media"><img src="${esc(m.src)}" alt="${esc(m.alt)}" loading="lazy"></div>`)
    : `<div class="video-placeholder result-media">${esc(hole("a screenshot or short recording of the sheet filling from bank alerts in config/replay.json"))}</div>`;
  let replay_html;
  if (/\.(mp4|webm)(\?|$)/i.test(cfg.replay_url || "")) {
    replay_html = `<div class="replay-player"><video controls playsinline preload="metadata" aria-label="${esc(cfg.class_name)}, masterclass replay"><source src="${esc(cfg.replay_url)}"></video></div>`;
  } else if (cfg.replay_embed_url) {
    replay_html = `<div class="replay-player"><iframe src="${esc(cfg.replay_embed_url)}" title="${esc(cfg.class_name)}, masterclass replay" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  } else if (cfg.replay_url) {
    replay_html = `<p class="actions"><a class="btn btn--big" href="${esc(cfg.replay_url)}" rel="noopener">Open the replay</a></p>`;
  } else {
    replay_html = `<div class="video-placeholder">${esc(hole("the replay link in config/replay.json"))}</div>`;
  }
  const common = {
    class_name: cfg.class_name,
    class_date: cfg.class_date,
    pixel_json: JSON.stringify({ content_ids: [cfg.slug], content_name: cfg.class_name, content_type: "product", value: price, currency: "NGN" }).replace(/</g, "\\u003c"),
  };
  const withPage = (page) => ({ ...common, pixel_json: JSON.stringify({ page, ...JSON.parse(common.pixel_json) }).replace(/</g, "\\u003c") });
  return [
    {
      path: `/${cfg.slug}/`,
      template: "pages/replay.html",
      layout: "base-replay.html",
      title: `${cfg.class_name} | ${site.publisher_name}`,
      description: "The replay of my live masterclass. See Claude read your bank alert emails and fill your sheet with money in and money out.",
      noindex: true,
      extra: {
        ...withPage("sales"),
        cta_label: `${cfg.cta}, ${cfg.price}`,
        price_line: priceLine,
        buy_href: cfg.buy_url || "#",
        result_html,
        refund_text: cfg.refund || hole("refund policy in config/replay.json"),
      },
    },
    {
      path: `/${cfg.slug}/thank-you/`,
      template: "pages/replay-thanks.html",
      layout: "base-replay.html",
      title: `Your replay | ${site.publisher_name}`,
      description: "Your masterclass replay from The Automate Stack.",
      noindex: true,
      extra: { ...withPage("thanks"), replay_html },
    },
  ];
}

/**
 * AutoStack Quick Class (config/classes.json): one registration page per class at /class/<classId>/,
 * and one shared watch page at /watch/ that reads ?class=<classId>.
 * ready = live (needs youtubeVideoId and ctaUrl). draft = built only in the draft preview.
 */
function quickClassEntries({ site, drafts }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "classes.json"), "utf8"));
  const kit = readStarterKit();
  const fill = (s) => String(s || "").replace(/\{(price_now|guarantee_days)\}/g, (_, k) => kit[k]);
  const resolve = (u) => (String(u || "").startsWith("site:") ? site[String(u).slice(5)] || "" : String(u || ""));
  const classes = [];
  for (const [classId, c] of Object.entries(cfg.classes)) {
    if (!/^[a-z0-9-]+$/.test(classId)) throw new Error(`config/classes.json: "${classId}" is not a valid classId. Use lowercase letters, numbers and dashes.`);
    if (c.status === "ready") {
      const missing = [["youtubeVideoId", c.youtubeVideoId], ["ctaUrl", resolve(c.ctaUrl)], ["pitchSeconds", Number(c.pitchSeconds) > 0]].filter(([, v]) => !v).map(([k]) => k);
      if (missing.length) throw new Error(`Quick Class "${classId}" is marked ready but config/classes.json has no ${missing.join(", ")}, so it will not build.`);
    }
    if (c.status === "ready" || (drafts && c.status === "draft")) classes.push({ classId, ...c });
  }

  const ctaHref = (c) => {
    const raw = resolve(c.ctaUrl);
    if (!raw) return "#";
    const u = new URL(raw, site.site_url);
    u.searchParams.set("utm_source", "quickclass");
    u.searchParams.set("utm_medium", "watchpage");
    u.searchParams.set("utm_campaign", c.classId);
    return u.toString();
  };
  const reviewsCfg = readReviews();
  const offerHtml = (c) => {
    const o = c.offer || {};
    // Community wins, shared by every class (watch_page in config/reviews.json).
    const proof = (reviewsCfg.watch_page || []).length ? reviewsHtml(reviewsCfg, reviewsCfg.watch_page) : "";
    const faq = (o.faq || []).map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(fill(f.answer))}</p></details>`).join("");
    return `<template id="qc-offer-${c.classId}"><section class="qc-offer" aria-labelledby="qc-offer-h-${c.classId}">
  <h2 id="qc-offer-h-${c.classId}">${esc(o.heading || "The AutoStack Starter Kit")}</h2>
  <ul class="tick-list">${(o.kitSummary || []).map((l) => `<li>${esc(fill(l))}</li>`).join("")}</ul>
  <p class="qc-price"><strong>${esc(fill(o.priceText))}</strong></p>
  ${o.foundingLine ? `<p>${esc(fill(o.foundingLine))}</p>` : ""}
  ${o.refundNote ? `<p>${esc(fill(o.refundNote))}${o.refundUrl ? ` <a href="${esc(o.refundUrl)}">${esc(o.refundLinkText || "How the guarantee works")}</a>` : ""}</p>` : ""}
  ${proof ? `<h3>${esc(reviewsCfg.watch_title || "Inside the community")}</h3>${proof}` : ""}
  ${faq ? `<h3>Questions</h3><div class="faq-list">${faq}</div>` : ""}
</section></template>`;
  };
  const testimonialsHtml = (c) => {
    // Slot for real testimonials only. Leave "testimonials" empty in config/classes.json until you have them.
    const list = (c.testimonials || []).filter((t) => t && t.quote && t.name);
    if (!list.length) return "<!-- testimonials slot: add real ones to config/classes.json -->";
    return `<section class="section"><div class="wrap read-wide"><h2>What people said</h2>${list.map((t) => `<blockquote class="qc-quote"><p>${esc(t.quote)}</p><footer>${esc(t.name)}</footer></blockquote>`).join("")}</div></section>`;
  };

  const previewHtml = (c) => {
    const v = c.preview || {};
    if (v.video) {
      // A short phone recording: silent, looping, narrow. The poster shows first and when motion is switched off.
      return `<figure class="qc-preview qc-preview--phone"><video src="${esc(v.video)}" poster="${esc(v.src || "")}" width="${Number(v.width) || 432}" height="${Number(v.height) || 960}" muted loop playsinline autoplay preload="metadata" aria-label="${esc(v.alt || "")}"></video>${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ""}</figure>`;
    }
    if (!v.src) return "";
    return `<figure class="qc-preview"><img src="${esc(v.src)}" width="${Number(v.width) || 720}" height="${Number(v.height) || 438}" alt="${esc(v.alt || "")}" loading="lazy">${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ""}</figure>`;
  };

  // Only what the watch page script needs. "<" is escaped so the JSON can sit safely inside a script tag.
  const classesJson = JSON.stringify(Object.fromEntries(classes.map((c) => [c.classId, {
    title: c.title, videoId: c.youtubeVideoId || "", pitchSeconds: Number(c.pitchSeconds) || 0,
    ctaText: c.ctaText || "Get the Starter Kit", ctaHref: ctaHref(c),
  }]))).replace(/</g, "\\u003c");

  return [
    ...classes.map((c) => ({
      path: `/class/${c.classId}/`,
      template: "pages/class.html",
      layout: "base-quickclass.html",
      title: `${c.title}: free AutoStack Quick Class | ${site.publisher_name}`,
      description: `${c.headline} A free AutoStack Quick Class.`,
      noindex: c.status !== "ready",
      extra: {
        class_id: c.classId, title: c.title, headline: c.headline, subhead: c.subhead, for_whom: c.forWhom,
        learn: (c.learn || []).map((text) => ({ text })), testimonials_html: testimonialsHtml(c), preview_html: previewHtml(c),
      },
    })),
    {
      path: "/watch/",
      template: "pages/watch.html",
      layout: "base-quickclass.html",
      title: `AutoStack Quick Class | ${site.publisher_name}`,
      description: "Watch your free AutoStack Quick Class.",
      noindex: true,
      extra: { classes_json: classesJson, offer_templates: classes.map(offerHtml).join("\n") },
    },
  ];
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
  const pos = readPositioning();
  const org = orgSchema(site);
  const resolveHref = (h) => (String(h).startsWith("site:") ? site[String(h).slice(5)] : h);
  const linkHtml = (l) => {
    if (!l) return "";
    const href = resolveHref(l.href);
    return `<a href="${esc(href)}"${/^https?:/.test(href) ? ' rel="noopener"' : ""}>${esc(l.label)}</a>`;
  };
  const homePillars = pos.pillars.map((p) => ({ title: p.title, text: p.text, link_html: linkHtml(p.link) }));
  const homeFaqs = pos.faqs.map((f, i) => ({
    question: f.question,
    answer: f.answer,
    open: i === 0 ? " open" : "",
    link_html: f.link ? ` ${linkHtml(f.link)}` : "",
  }));
  const homeFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pos.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  const kit = readStarterKit();
  const reviewsCfg = readReviews();
  // Founding member spots. Update founding_taken in config/starter-kit.json whenever someone joins.
  const foundingCap = Number(kit.founding_cap) || 0;
  const foundingTaken = Number(kit.founding_taken) || 0;
  const spotsLeft = Math.max(0, foundingCap - foundingTaken);
  // Partner share maths, worked out from the price so it stays true when the price changes.
  const priceNum = Number(String(kit.price_now).replace(/[^0-9]/g, "")) || 0;
  const partnerPer = Math.round((priceNum * (Number(kit.partner_pct) || 0)) / 100);
  const partnerN = partnerPer ? Math.ceil(priceNum / partnerPer) : 0;
  const naira = (n) => "\u20a6" + Number(n).toLocaleString("en-US");
  const scarcityLine = foundingCap && spotsLeft > 0 ? `Only ${spotsLeft} of ${foundingCap} founding spots left` : "";
  const onboardingLine = !foundingCap ? "" : spotsLeft > 0
    ? `The first ${foundingCap} founding members also get a one-on-one onboarding call with me, so I understand your use case. ${foundingTaken} are in. ${spotsLeft} spots left.`
    : `The first ${foundingCap} founding members got a one-on-one onboarding call with me. Those spots are full.`;
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
  const kitExtra = { faqs: kit.faqs.map((f, i) => ({ ...f, open: i === 0 ? " open" : "" })), header_note: "The AutoStack Starter Kit", guarantee_bonus: kit.guarantee_bonus, guarantee_days: kit.guarantee_days, price_was: kit.price_was, price_now: kit.price_now, scarcity_line: scarcityLine, community_yearly: naira((kit.stack.bonuses.find((b) => b.community) || {}).value || 0), partner_per: naira(partnerPer), partner_n: partnerN, partner_back: naira(partnerPer * partnerN), onboarding_line: onboardingLine, stack_html: stackHtml(kit, spotsLeft, foundingTaken, foundingCap), recap_html: recapHtml(kit, spotsLeft), trust: [], buy_href: site.starter_kit_url, pixel_json: JSON.stringify({ content_ids: ["starter-kit"], content_name: "AutoStack Starter Kit", content_type: "product", value: Number(String(kit.price_now).replace(/[^0-9]/g, "")) || 0, currency: "NGN" }).replace(/</g, "\u003c"), reviews_title: reviewsCfg.title, reviews_intro: reviewsCfg.intro, reviews_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_top), reviews_more_title: reviewsCfg.more_title, reviews_buy_title: reviewsCfg.buy_title, reviews_buy_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_buy), reviews_more_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_more), reviews_community_html: reviewsHtml(reviewsCfg, reviewsCfg.starter_kit_community) };
  const kitPage = (v) => {
    const c = kit.pages[v];
    return {
      hero_eyebrow: c.eyebrow || "", hero_callout: c.callout || "", hero_title: c.title, hero_clips: kit.hero_clips, hero_tap: kit.hero_tap, hero_cta: c.hero_cta, h1_class: c.title.length > 85 ? "h1-long" : "", hero_sub: c.sub, cta_label: c.cta, 
      groups_title: kit.groups_title, groups_intro: kit.groups_intro, groups: kit.groups.map((g) => ({ ...g, media_html: [[g.video, g.poster], [g.video2, g.poster2]].filter((m) => m[0]).map((m) => `<video class="pillar-video" controls playsinline preload="none" poster="${m[1]}"><source src="${m[0]}" type="video/mp4"></video>`).join("") })), price_title: kit.price_title,
      pixel_json: JSON.stringify({ content_ids: ["starter-kit"], content_name: "AutoStack Starter Kit", content_type: "product", page_variant: v, value: Number(String(kit.price_now).replace(/[^0-9]/g, "")) || 0, currency: "NGN" }).replace(/</g, "\\u003c"),
    };
  };
  const replayPages = replayEntries({ site, drafts });
  const pages = [
    ...replayPages,
    ...quickClassEntries({ site, drafts }),
    {
      path: "/",
      template: "pages/home.html",
      title: `${site.publisher_name} | AI setups, automation and consulting`,
      description: pos.meta_description,
      jsonld: jsonLdScripts(org, { "@context": "https://schema.org", "@type": "WebSite", name: site.publisher_name, url: `${site.site_url}/` }, homeFaqSchema),
      extra: { latest, kit_jobs: kit.groups.map((g) => ({ name: g.name, new: g.new })), home_reviews_title: reviewsCfg.home_title, home_reviews_intro: reviewsCfg.home_intro, home_reviews_html: reviewsHtml(reviewsCfg, reviewsCfg.home), entity_statement: pos.entity_statement, pillars: homePillars, faq_title: pos.faq_title, home_faqs: homeFaqs },
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
      description: "36 ready-made templates that connect AI to the tools you already use: Notion, Gmail, your spreadsheets, Canva and Trello. Prompts written, a test checklist on each one.",
      jsonld: jsonLdScripts(kitFaqSchema),
      extra: { ...kitExtra, ...kitPage("solution") },
    },
    // For visitors who feel the pain but have not yet thought of AI as the fix. Hidden from search, reached from ads.
    {
      path: "/reclaim-your-time/",
      template: "pages/starter-kit-problem.html",
      layout: "base-sales.html",
      title: `Get 10 hours of your week back | ${site.publisher_name}`,
      description: "Connect 36 simple templates to the apps you already use so your reports, money tracking and posts get done in one sitting. No coding needed.",
      noindex: true,
      canonicalPath: "/starter-kit/",
      jsonld: jsonLdScripts(kitFaqSchema),
      extra: { ...kitExtra, ...kitPage("problem") },
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
      jsonld: pg.noindex || pg.path === "/" ? pg.jsonld || "" : jsonLdScripts(org) + (pg.jsonld ? "\n  " + pg.jsonld : ""),
      robots: pg.noindex ? "noindex, nofollow" : base.robots,
    }, pg.layout);
    writeFile(pg.file ? path.join(out, pg.file) : path.join(out, pg.path.slice(1), "index.html"), html);
    return { path: pg.path, title: pg.title, description: pg.description, indexable: !pg.noindex };
  });
}

const PIXEL_BLOCK = /\n?<!-- meta-pixel:start -->[\s\S]*?<!-- meta-pixel:end -->\n?/g;
const ORG_BLOCK = /\n?<!-- org-schema:start -->[\s\S]*?<!-- org-schema:end -->\n?/g;
const NOTICE_BLOCK = /\n?<!-- meta-notice:start -->[\s\S]*?<!-- meta-notice:end -->\n?/g;

/**
 * The pages written by hand (no shared template) get the same Pixel and tracking notice, between markers,
 * so the one Pixel ID in config/site.json is the only place to change. Runs only for the real build.
 * With no ID set it removes the blocks again.
 */
export function injectIntoHandWrittenPages(site) {
  const on = Boolean(site.meta_pixel_id);
  const pixel = on ? renderPartial("meta-pixel", { meta_pixel_id: site.meta_pixel_id, pixel_json: "{}", purchase_value: 0 }).trim() : "";
  const loc = site.location_line ? '<p class="text-center text-[11px] text-muted-stone pt-4 px-6">' + site.location_line + "</p>" : "";
  const reg = site.registration_line ? '<p class="text-center text-[11px] text-muted-stone pt-4 px-6">' + site.registration_line + "</p>" : "";
  const pix = on ? '<p class="text-center text-[11px] text-muted-stone py-4 px-6">This site uses the Meta Pixel to measure my ads. It saves cookies on your device. See the <a href="/privacy/" class="underline">privacy note</a> for what it records and how to opt out.</p>' : "";
  const notice = [loc, reg, pix].filter(Boolean).join("\n");
  const changed = [];
  for (const d of fs.readdirSync(PUBLIC, { withFileTypes: true })) {
    if (!d.isDirectory() || ["blog", "assets", "api"].includes(d.name) || d.name.startsWith(".")) continue;
    const file = path.join(PUBLIC, d.name, "index.html");
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    if (before.includes('class="skip-link"')) continue; // generated page, already handled by the layout
    let h = before.replace(PIXEL_BLOCK, "").replace(NOTICE_BLOCK, "").replace(ORG_BLOCK, "");
    h = h.replace("</head>", () => "<!-- org-schema:start -->\n" + jsonLdScripts(orgSchema(site)) + "\n<!-- org-schema:end -->\n</head>");
    if (on) h = h.replace("</head>", () => "<!-- meta-pixel:start -->\n" + pixel + "\n<!-- meta-pixel:end -->\n</head>");
    if (notice) {
      const i = h.lastIndexOf("</footer>");
      if (i > -1) h = h.slice(0, i) + "<!-- meta-notice:start -->\n" + notice + "\n<!-- meta-notice:end -->\n" + h.slice(i);
    }
    if (h !== before) { fs.writeFileSync(file, h); changed.push("/" + d.name + "/"); }
  }
  return changed;
}
