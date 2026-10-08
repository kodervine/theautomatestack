import { marked } from "marked";
import { esc, jsonForScript } from "./util.js";

marked.setOptions({ gfm: true, breaks: false });

/** Markdown to HTML. A post has one h1 (the title), so any # in the body becomes an h2. */
export function renderMarkdown(md) {
  let html = marked.parse(md);
  html = html.replace(/<h1(\s|>)/g, "<h2$1").replace(/<\/h1>/g, "</h2>");
  html = html.replace(/<img /g, '<img loading="lazy" decoding="async" ');
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" rel="noopener"');
  return html;
}

/** The five CTA buttons. Every URL comes from config/site.json. */
export function ctaItems(site) {
  const ext = ' rel="noopener"';
  return [
    { label: "Follow on Instagram", url: site.instagram_url, class: " btn--ghost", attrs: ext },
    { label: "Follow on TikTok", url: site.tiktok_url, class: " btn--ghost", attrs: ext },
    { label: "Subscribe on YouTube", url: site.youtube_url, class: " btn--ghost", attrs: ext },
    { label: "Get the Starter Kit", url: site.starter_kit_url, class: "", attrs: ext },
    { label: "Visit the site", url: `${site.site_url}/`, class: " btn--ghost", attrs: "" },
  ];
}

export function socialLinks(site) {
  return [site.instagram_url, site.tiktok_url, site.youtube_url].filter((u) => u && !/^TODO/i.test(u));
}

export function faqHtml(faqs) {
  if (!faqs.length) return "";
  const items = faqs.map((f) => `    <h3>${esc(f.question)}</h3>\n    <p>${esc(f.answer)}</p>`).join("\n");
  return `<section class="faqs" aria-labelledby="faq-heading">\n    <h2 id="faq-heading">Questions people ask</h2>\n${items}\n    </section>`;
}

export function articleJsonLd(post, site, canonical, image) {
  const sameAs = socialLinks(site);
  const logo = `${site.site_url}${site.logo_path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    image: [image],
    keywords: post.tags.join(", "),
    author: { "@type": "Person", name: site.author_name, url: `${site.site_url}/`, sameAs },
    publisher: {
      "@type": "Organization",
      name: site.publisher_name,
      url: `${site.site_url}/`,
      logo: { "@type": "ImageObject", url: logo },
      sameAs,
    },
  };
}

export function faqJsonLd(post, canonical) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function jsonLdScripts(...objects) {
  return objects
    .filter(Boolean)
    .map((o) => `<script type="application/ld+json">\n${jsonForScript(o)}\n  </script>`)
    .join("\n  ");
}

export const NAV = [
  { url: "/freebies/", label: "Start here" },
  { url: "/starter-kit/", label: "Starter Kit" },
  { url: "/blueprint/", label: "Blueprint" },
  { url: "/services/", label: "Consulting" },
  { url: "/dm-automation/", label: "DM Automation" },
  { url: "/blog/", label: "Blog" },
];

/** Main nav with the current section marked. */
export function navItems(activePath = "", hasBlog = true) {
  return NAV.filter((n) => hasBlog || n.url !== "/blog/").map((n) => ({ ...n, current: activePath.startsWith(n.url) ? ' aria-current="page"' : "" }));
}
