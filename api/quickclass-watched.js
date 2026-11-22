// Vercel serverless function: POST /api/quickclass-watched
// Sent once by the watch page when a viewer has really watched up to the offer point.
//   N8N_WATCHED_WEBHOOK_URL   the n8n webhook (Production URL). Never sent to the browser.
import { cleanEmail, findClass, rateLimited, watchedPayload, postToN8n, sendJson, readBody } from "./_quickclass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    return res.end("Method not allowed");
  }
  const body = readBody(req);
  const cls = findClass(body.classId);
  const email = cleanEmail(body.email);
  if (!cls || !email) return sendJson(res, 400, { ok: false });
  if (rateLimited(req, { bucket: "watched", limit: 10 })) return sendJson(res, 429, { ok: false });

  try {
    await postToN8n("N8N_WATCHED_WEBHOOK_URL", watchedPayload(cls, email));
  } catch (err) {
    console.error("quickclass watched failed:", err.message);
    return sendJson(res, 502, { ok: false });
  }
  return sendJson(res, 200, { ok: true });
}
