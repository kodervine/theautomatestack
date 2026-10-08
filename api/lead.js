// Vercel serverless function: POST /api/lead
// Saves a freebie signup to the Notion "Leads" database, then sends the visitor straight to the download (Selar).
// Secrets come from environment variables, never from the repo:
//   NOTION_LEADS_TOKEN              Notion integration token (falls back to NOTION_TOKEN for local testing)
//   NOTION_LEADS_DATA_SOURCE_ID     optional, defaults to the Leads data source below
import freebiesData from "../config/freebies.json" with { type: "json" };

const LEADS_DATA_SOURCE_ID = "6cefd048-3d76-4c55-9d2c-201ac9afaa7e";
const NOTION_VERSION = "2025-09-03";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

async function notion(path, body) {
  const token = process.env.NOTION_LEADS_TOKEN || process.env.NOTION_TOKEN;
  if (!token) throw new Error("No NOTION_LEADS_TOKEN set");
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Notion ${res.status}: ${data.message || "request failed"}`);
  return data;
}

function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader("Location", location);
  res.end();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    return res.end("Method not allowed");
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const freebie = freebiesData.freebies.find((f) => f.id === String(body.freebie || ""));
  if (!freebie) {
    res.statusCode = 400;
    return res.end("Unknown resource.");
  }
  const download = freebie.download_url;

  // Hidden field only bots fill in. Act like it worked and save nothing.
  if (clean(body.website, 50)) return redirect(res, download);

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  if (!name || !EMAIL_RE.test(email) || body.consent !== "yes") {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Please go back and check your name, your email and the consent box.");
  }

  try {
    const dataSourceId = process.env.NOTION_LEADS_DATA_SOURCE_ID || LEADS_DATA_SOURCE_ID;
    const existing = await notion(`data_sources/${dataSourceId}/query`, {
      filter: { property: "Email", email: { equals: email } },
      page_size: 1,
    });
    if (!existing.results.length) {
      await notion("pages", {
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        properties: {
          Name: { title: [{ text: { content: name } }] },
          Email: { email },
          Status: { select: { name: "New" } },
          Source: { select: { name: freebie.source } },
          "Interested in": { select: { name: "Not sure" } },
          Notes: { rich_text: [{ text: { content: `Freebie: ${freebie.title}. Consent given on the website. ${new Date().toISOString()}` } }] },
        },
      });
    }
  } catch (err) {
    // Do not make the visitor pay for our problem: log it and still give them the download.
    console.error("lead save failed:", err.message);
  }

  return redirect(res, download);
}
