// AutoStack Quick Class: the honest progress rule and the payloads sent to n8n.
import test from "node:test";
import assert from "node:assert/strict";
import { tick, crossedQuarters } from "../public/assets/js/qc-progress.js";
import kit from "../config/starter-kit.json" with { type: "json" };
import { findClass, registerPayload, watchedPayload, offerUrl, cleanEmail, resetRateLimits } from "../api/_quickclass.js";
import register from "../api/quickclass-register.js";

const play = (state, times) => times.reduce((s, t) => tick(s, t), state);
const fresh = { maxWatched: 0, last: null };

test("normal playback advances maxWatched", () => {
  const s = play(fresh, [0, 1, 2, 3, 4, 5]);
  assert.equal(s.maxWatched, 5);
});

test("2x speed still counts", () => {
  const s = play(fresh, [0, 2, 4, 6]);
  assert.equal(s.maxWatched, 6);
});

test("scrubbing to the end does not advance maxWatched", () => {
  const s = play(fresh, [0, 1, 2, 1300, 1301, 1302, 1303]);
  assert.equal(s.maxWatched, 2);
});

test("going back and replaying does not lower or fake maxWatched", () => {
  const s = play({ maxWatched: 500, last: null }, [100, 101, 102]);
  assert.equal(s.maxWatched, 500);
});

test("resuming at maxWatched carries on counting", () => {
  const s = play({ maxWatched: 500, last: null }, [498, 499, 500, 501, 502]);
  assert.equal(s.maxWatched, 502);
});

test("quarters crossed", () => {
  assert.deepEqual(crossedQuarters(0, 1000), []);
  assert.deepEqual(crossedQuarters(500, 1000), [25, 50]);
  assert.deepEqual(crossedQuarters(800, 0), []);
});

test("payloads carry the fields the n8n workflow reads, with links built from config", () => {
  const cls = findClass("income-tracker", { allowDrafts: true });
  assert.ok(cls);
  const reg = registerPayload(cls, "Ada", "ada@example.com");
  const emailKeys = ["classId", "classLength", "classPromise", "classTitle", "email", "offerName", "offerNote", "offerPrice", "offerSummary", "offerUrl", "watchUrl"];
  assert.deepEqual(Object.keys(reg).sort(), [...emailKeys, "name"].sort());
  assert.equal(reg.offerPrice, kit.price_now);
  assert.ok(!/{[a-z_]+}/.test(JSON.stringify(reg)), "no unfilled {tokens} reach the email");
  assert.match(reg.watchUrl, /\/watch\/\?class=income-tracker&e=ada%40example\.com$/);
  assert.match(reg.offerUrl, /utm_source=quickclass&utm_medium=email&utm_campaign=income-tracker/);
  const w = watchedPayload(cls, "ada@example.com");
  assert.deepEqual(Object.keys(w).sort(), [...emailKeys, "email"].filter((k, i, a) => a.indexOf(k) === i).sort());
  assert.match(offerUrl(cls, "watchpage"), /utm_medium=watchpage/);
});

test("unknown classes and bad emails are rejected", () => {
  assert.equal(findClass("nope", { allowDrafts: true }), null);
  assert.equal(findClass("../config", { allowDrafts: true }), null);
  assert.equal(cleanEmail("not-an-email"), "");
  assert.equal(cleanEmail(" Ada@Example.COM "), "ada@example.com");
});

function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b = "") { this.body = b; },
  };
}

test("honeypot: a filled hidden field gets a success answer and nothing is sent", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...a) => { calls.push(a); return new Response("{}"); };
  process.env.N8N_REGISTER_WEBHOOK_URL = "https://n8n.invalid/webhook/quickclass-register";
  try {
    const res = fakeRes();
    await register({ method: "POST", headers: { "content-type": "application/json" }, body: { name: "Bot", email: "bot@example.com", classId: "income-tracker", website: "spam.example" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a real signup posts once to n8n and answers with the watch link", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return new Response("{}"); };
  process.env.N8N_REGISTER_WEBHOOK_URL = "https://n8n.invalid/webhook/quickclass-register";
  try {
    const res = fakeRes();
    await register({ method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: { name: "Ada", email: "ada@example.com", classId: "income-tracker", website: "" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.classTitle, "Income Tracker");
    assert.equal(JSON.parse(res.body).redirect, "/watch/?class=income-tracker&e=ada%40example.com");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("rate limit: many people on one shared mobile IP can all register, one email retrying is stopped", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}");
  process.env.N8N_REGISTER_WEBHOOK_URL = "https://n8n.invalid/webhook/quickclass-register";
  resetRateLimits();
  const signup = async (email) => {
    const res = fakeRes();
    await register({ method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "102.89.0.1" }, body: { name: "Ada", email, classId: "income-tracker", website: "" } }, res);
    return res.statusCode;
  };
  try {
    // 30 different people behind the same carrier IP.
    for (let i = 0; i < 30; i++) assert.equal(await signup(`person${i}@example.com`), 200);
    // One person retrying: 5 tries are fine, the 6th is stopped.
    for (let i = 0; i < 5; i++) assert.equal(await signup("retry@example.com"), 200);
    assert.equal(await signup("retry@example.com"), 429);
  } finally {
    globalThis.fetch = realFetch;
    resetRateLimits();
  }
});

test("background tab: a long gap of real playback counts, a scrub does not", async () => {
  const { allowedStep } = await import("../public/assets/js/qc-progress.js");
  // Playing in a background tab: one tick a minute, video moved 60 s in 60 s of real time.
  let s = tick({ maxWatched: 100, last: 100 }, 160, allowedStep(60, 1));
  assert.equal(s.maxWatched, 160);
  // Foreground, 1 s between ticks, viewer drags to 400: not counted, and the next normal ticks do not count either.
  s = tick({ maxWatched: 100, last: 100 }, 400, allowedStep(1, 1));
  s = tick(s, 401, allowedStep(1, 1));
  assert.equal(s.maxWatched, 100);
  // Paused (no elapsed allowance) then scrubbed forward: not counted.
  s = tick({ maxWatched: 100, last: 100 }, 300, allowedStep(0));
  assert.equal(s.maxWatched, 100);
});
