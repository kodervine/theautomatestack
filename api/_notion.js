// Shared Notion helper for the Vercel functions. Files starting with _ are not routes.
// Secrets come from environment variables, never from the repo:
//   NOTION_LEADS_TOKEN              Notion integration token (falls back to NOTION_TOKEN for local testing)
//   NOTION_LEADS_DATA_SOURCE_ID     optional, defaults to the Leads data source below

const LEADS_DATA_SOURCE_ID = "6cefd048-3d76-4c55-9d2c-201ac9afaa7e";
const NOTION_VERSION = "2025-09-03";

async function notion(path, body) {
  const token = process.env.NOTION_LEADS_TOKEN || process.env.NOTION_TOKEN;
  if (!token) throw new Error("No NOTION_LEADS_TOKEN set");
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Notion ${res.status}: ${data.message || "request failed"}`);
  return data;
}

/**
 * Adds a row to the Notion "Leads" database.
 * With skipIfExists, an email already in Leads is left alone (the freebie form).
 * Without it, a row is always added, so a backup note is never hidden behind an older row.
 */
export async function saveLead({ name, email, source, interestedIn = "Not sure", notes, skipIfExists = false }) {
  const dataSourceId = process.env.NOTION_LEADS_DATA_SOURCE_ID || LEADS_DATA_SOURCE_ID;
  if (skipIfExists) {
    const existing = await notion(`data_sources/${dataSourceId}/query`, {
      filter: { property: "Email", email: { equals: email } },
      page_size: 1,
    });
    if (existing.results.length) return false;
  }
  await notion("pages", {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Email: { email },
      Status: { select: { name: "New" } },
      Source: { select: { name: source } },
      "Interested in": { select: { name: interestedIn } },
      Notes: { rich_text: [{ text: { content: String(notes).slice(0, 1900) } }] },
    },
  });
  return true;
}
