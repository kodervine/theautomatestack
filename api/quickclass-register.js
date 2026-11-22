// Vercel serverless function: POST /api/quickclass-register
// A Quick Class signup. Checks the details, then sends them to n8n and returns the watch page link.
//   N8N_REGISTER_WEBHOOK_URL   the n8n webhook (Production URL). Never sent to the browser.
// Accepts JSON (the page script) or a normal form post (when JavaScript is off, it answers with a redirect).
import { clean, cleanEmail, findClass, rateLimited, registerPayload, postToN8n, sendJson, readBody, watchPath } from "./_quickclass.js";

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

  if (rateLimited(req)) return fail(429, "Too many tries. Please wait a few minutes and try again.");

  const name = clean(body.name, 100);
  const email = cleanEmail(body.email);
  if (!name) return fail(400, "Please add your name.");
  if (!email) return fail(400, "Please check your email address.");

  try {
    await postToN8n("N8N_REGISTER_WEBHOOK_URL", registerPayload(cls, name, email));
  } catch (err) {
    console.error("quickclass register failed:", err.message);
    return fail(502, "Something went wrong on my side. Please try again.");
  }
  return done(watchPath(cls.classId, email));
}
