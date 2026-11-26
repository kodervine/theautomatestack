// Vercel serverless function: POST /api/lead
// Saves a freebie signup to the Notion "Leads" database, then sends the visitor straight to the download (Selar).
// The Notion token and data source come from environment variables, see api/_notion.js.
import freebiesData from "../config/freebies.json" with { type: "json" };
import { saveLead } from "./_notion.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

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
    await saveLead({
      name,
      email,
      source: freebie.source,
      notes: `Freebie: ${freebie.title}. Consent given on the website. ${new Date().toISOString()}`,
      skipIfExists: true,
    });
  } catch (err) {
    // Do not make the visitor pay for our problem: log it and still give them the download.
    console.error("lead save failed:", err.message);
  }

  return redirect(res, download);
}
