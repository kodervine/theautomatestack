// Vercel serverless function: POST /api/quickclass-register
// A Quick Class signup. Checks the details, then sends them to n8n and returns the watch page link.
// If n8n cannot be reached, the signup is saved to the Notion "Leads" database instead (see api/_notion.js),
// and the visitor still goes to the class: a broken server on my side must never cost a lead or a viewer.
//   N8N_REGISTER_WEBHOOK_URL   the n8n webhook (Production URL). Never sent to the browser.
// Accepts JSON (the page script) or a normal form post (when JavaScript is off, it answers with a redirect).
import { clean, cleanEmail, findClass, rateLimited, registerPayload, postToN8n, sendJson, readBody, watchPath } from "./_quickclass.js";
import { saveLead } from "./_notion.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    return res.end("Method not allowed");
  }
  const isForm = /application\/x-www-form-urlencoded/i.test(req.headers["content-type"] || "");
  const body = readBody(req);
  const cls = findClass(body.classId);

  const fail = (status, message) => {
    if (!isForm) return sendJson(res, status, { ok: false, error: message });
    res.statusCode = 303;
    res.setHeader("Location", cls ? `/class/${cls.classId}/?error=1` : "/");
    return res.end();
  };
  const done = (location) => {
    if (!isForm) return sendJson(res, 200, { ok: true, redirect: location });
    res.statusCode = 303;
    res.setHeader("Location", location);
    return res.end();
  };

  if (!cls) return fail(400, "This class is not available.");

  // Hidden field only bots fill in. Act like it worked and send nothing.
  if (clean(body.website, 50)) return done(watchPath(cls.classId));

  const name = clean(body.name, 100);
  const email = cleanEmail(body.email);
  if (!name) return fail(400, "Please add your name.");
  if (!email) return fail(400, "Please check your email address.");

  if (rateLimited(req, { email })) return fail(429, "Too many tries. Please wait a few minutes and try again.");

  try {
    await postToN8n("N8N_REGISTER_WEBHOOK_URL", registerPayload(cls, name, email));
  } catch (err) {
    console.error("quickclass register failed:", err.message);
    try {
      await saveLead({
        name,
        email,
        source: "Webinar",
        notes: `Quick Class backup: ${cls.title} (${cls.classId}). n8n failed (${err.message}), so no class email and not in Kit. Add to Kit by hand. ${new Date().toISOString()}`,
      });
      console.error("quickclass register: saved to Notion backup");
    } catch (backupErr) {
      // Both failed. The log line below is the only record, so it carries the details.
      console.error("quickclass register LOST:", JSON.stringify({ name, email, classId: cls.classId }), backupErr.message);
    }
  }
  return done(watchPath(cls.classId, email));
}
