// AutoStack Quick Class: the registration form and the watch page. No libraries.
// ?debug=1 logs every tracking event to the console and shows test buttons on the watch page.
import { tick, allowedStep, crossedQuarters } from "./qc-progress.js";

const params = new URLSearchParams(location.search);
const DEBUG = params.get("debug") === "1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode or full: carry on */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function log(...args) {
  if (DEBUG) console.log("[quickclass]", ...args);
}

/** Meta Pixel. Standard events use track, our own names use trackCustom. Always includes classId. */
function pixel(name, classId, custom = false) {
  const data = { classId };
  log("pixel", name, data);
  if (typeof window.fbq === "function") window.fbq(custom ? "trackCustom" : "track", name, data);
}

// ---------------------------------------------------------------- registration page
function initRegister(form) {
  const status = document.getElementById("qc-status");
  const button = form.querySelector('button[type="submit"]');
  const fields = {
    name: { input: form.elements.name, error: document.getElementById("qc-name-error") },
    email: { input: form.elements.email, error: document.getElementById("qc-email-error") },
  };
  const classId = form.elements.classId.value;
  let busy = false;
  let lastSubmit = 0;

  const setStatus = (text, isError) => {
    status.textContent = text;
    status.dataset.error = isError ? "1" : "";
  };
  const setFieldError = (f, text) => {
    f.error.textContent = text;
    f.error.hidden = !text;
    f.input.setAttribute("aria-invalid", text ? "true" : "false");
  };
  if (params.get("error") === "1") setStatus("Something went wrong. Please try again.", true);

  const validate = () => {
    const name = fields.name.input.value.trim();
    const email = fields.email.input.value.trim().toLowerCase();
    setFieldError(fields.name, name ? "" : "Please add your name.");
    setFieldError(fields.email, EMAIL_RE.test(email) ? "" : "Please check your email address.");
    if (!name) fields.name.input.focus();
    else if (!EMAIL_RE.test(email)) fields.email.input.focus();
    return name && EMAIL_RE.test(email) ? { name, email } : null;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Debounce: ignore double taps and repeat presses while a request is out.
    if (busy || Date.now() - lastSubmit < 1500) return;
    const values = validate();
    if (!values) return setStatus("", false);
    busy = true;
    lastSubmit = Date.now();
    button.disabled = true;
    setStatus("Getting your class ready...", false);
    log("register", { classId });
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, classId, website: form.elements.website.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Please try again.");
      const target = typeof data.redirect === "string" && data.redirect.startsWith("/watch/") ? data.redirect : `/watch/?class=${encodeURIComponent(classId)}`;
      setStatus("Done. Taking you to the class.", false);
      pixel("Lead", classId);
      // A moment for the Pixel to send before the page moves on.
      setTimeout(() => location.assign(target + (DEBUG ? "&debug=1" : "")), DEBUG ? 600 : 250);
    } catch (err) {
      setStatus(`Something went wrong. ${err.message} What you typed is still here.`, true);
      busy = false;
      button.disabled = false;
    }
  });
}

/** Every "Watch the class" button opens the same small form. Without JS the form just shows on the page. */
function initModal(dialog, form) {
  if (!dialog || typeof dialog.showModal !== "function") return;
  const open = (e) => {
    e.preventDefault();
    if (!dialog.open) dialog.showModal();
    form.elements.name.focus();
  };
  document.querySelectorAll("[data-qc-open]").forEach((el) => el.addEventListener("click", open));
  dialog.querySelector("[data-qc-close]")?.addEventListener("click", () => dialog.close());
  // A click on the dark backdrop (outside the box) closes it.
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  if (location.hash === "#register") dialog.showModal();
}

// Intro video: it autoplays muted. A tap reloads it from the start with sound.
// The tap counts as the visitor's permission, so the browser lets the sound play.
document.querySelectorAll("[data-qc-sound]").forEach((btn) => btn.addEventListener("click", () => {
  const iframe = btn.parentElement.querySelector("iframe");
  if (iframe) iframe.src = btn.dataset.qcSound;
  btn.hidden = true;
  log("intro: sound on");
}));

// ---------------------------------------------------------------- watch page
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (window.__qcYT) return window.__qcYT;
  window.__qcYT = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return window.__qcYT;
}

function fmt(sec) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function initWatch(dataEl) {
  let classes = {};
  try { classes = JSON.parse(dataEl.textContent); } catch { classes = {}; }
  const classId = String(params.get("class") || "").trim().toLowerCase();
  const cls = /^[a-z0-9-]+$/.test(classId) && Object.hasOwn(classes, classId) ? classes[classId] : null;
  const titleEl = document.getElementById("qc-title");

  if (!cls || !cls.videoId) {
    titleEl.textContent = "This class isn't available";
    document.getElementById("qc-missing").hidden = false;
    log("unknown or unfinished class", classId);
    return;
  }

  titleEl.textContent = cls.title;
  document.title = `${cls.title} | AutoStack Quick Class`;
  document.getElementById("qc-class").hidden = false;

  // The email was moved out of the URL into storage by the script in <head>.
  const rawEmail = (store.get("qc_email") || "").trim().toLowerCase();
  const email = rawEmail.length <= 200 && EMAIL_RE.test(rawEmail) ? rawEmail : "";

  const K = {
    max: `max_time_${classId}`,
    revealed: `revealed_${classId}`,
    sent: `watched_sent_${classId}`,
    px: (n) => `px_${n}_${classId}`,
  };
  const pitch = cls.pitchSeconds;
  let state = { maxWatched: Math.max(0, Number(store.get(K.max)) || 0), last: null };
  let revealed = false;
  let sending = false;
  let player = null;
  let timer = null;

  const cta = document.getElementById("qc-cta");
  document.getElementById("qc-cta-text").textContent = cls.ctaText;
  cta.href = cls.ctaHref;
  // Opens Selar in a new tab, so the class keeps playing here if they have not finished it.
  // This page stays open, so the Pixel event has time to send without holding the click back.
  cta.addEventListener("click", () => {
    pixel("QuickClassCTAClick", classId, true);
    // Pause, so they come back to the same spot instead of missing part of the class.
    if (player && player.pauseVideo) player.pauseVideo();
  });
  cta.addEventListener("auxclick", (e) => { if (e.button === 1) pixel("QuickClassCTAClick", classId, true); });

  const debugState = document.getElementById("qc-debug-state");
  const showState = () => {
    if (DEBUG) debugState.textContent = `maxWatched ${fmt(state.maxWatched)} (${Math.floor(state.maxWatched)}s), pitch at ${pitch}s, revealed ${revealed}, watched sent ${store.get(K.sent) === "1"}, email ${email ? "known" : "none"}`;
  };

  function sendWatched() {
    if (!email) { log("watched: no email, webhook skipped"); return; }
    if (store.get(K.sent) === "1" || sending) { log("watched: already sent"); return; }
    sending = true;
    log("watched: sending", { classId });
    fetch("/api/quickclass-watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, classId }),
      keepalive: true,
    }).then((res) => {
      // Mark it sent only when it worked, so a failed send is tried again on the next visit.
      if (res.ok) store.set(K.sent, "1");
      log("watched: answer", res.status);
    }).catch((err) => log("watched: failed", err.message)).finally(() => { sending = false; showState(); });
  }

  function reveal({ first }) {
    if (revealed) return;
    revealed = true;
    const slot = document.getElementById("qc-offer-slot");
    const tpl = document.getElementById(`qc-offer-${classId}`);
    if (tpl) slot.appendChild(tpl.content.cloneNode(true));
    slot.hidden = false;
    document.getElementById("qc-note").hidden = true;
    if (first) {
      store.set(K.revealed, "1");
      pixel("QuickClassOfferShown", classId, true);
    }
    log("offer revealed", { first });
    sendWatched();
    showState();
  }

  function progress() {
    const duration = player && player.getDuration ? player.getDuration() : 0;
    for (const p of crossedQuarters(state.maxWatched, duration)) {
      if (store.get(K.px(p)) === "1") continue;
      store.set(K.px(p), "1");
      pixel(`QuickClassProgress${p}`, classId, true);
    }
    if (!revealed && state.maxWatched >= pitch) reveal({ first: true });
  }

  let lastPollAt = 0;
  let wasPlaying = false;
  function poll() {
    if (!player || !player.getCurrentTime) return;
    const now = performance.now();
    // Real elapsed time only widens the allowance when the video was playing the whole time since the last reading.
    // While paused, a forward move is a scrub and must not count however long the pause was.
    const allowed = wasPlaying && lastPollAt
      ? allowedStep((now - lastPollAt) / 1000, player.getPlaybackRate ? player.getPlaybackRate() : 1)
      : allowedStep(0);
    lastPollAt = now;
    wasPlaying = player.getPlayerState && window.YT && player.getPlayerState() === window.YT.PlayerState.PLAYING;
    // Sound turned on from YouTube's own controls: the button is no longer needed.
    if (player.isMuted && !player.isMuted()) document.getElementById("qc-sound").hidden = true;
    const before = state.maxWatched;
    state = tick(state, player.getCurrentTime(), allowed);
    if (state.maxWatched !== before) store.set(K.max, state.maxWatched.toFixed(1));
    progress();
    showState();
  }

  // Returning viewer: show what they already unlocked, and retry the watched event if it never got through.
  if (store.get(K.revealed) === "1" || state.maxWatched >= pitch) reveal({ first: store.get(K.revealed) !== "1" });

  // Returning viewer: autoplay picks up a couple of seconds before where they stopped.
  const startAt = state.maxWatched > 10 ? Math.floor(state.maxWatched - 2) : 0;
  const resume = document.getElementById("qc-resume");

  // Browsers only autoplay muted video. The button turns the sound on (and plays, if autoplay was blocked).
  const sound = document.getElementById("qc-sound");
  sound.addEventListener("click", () => {
    if (!player || !player.unMute) return;
    player.unMute();
    player.setVolume(100);
    player.playVideo();
    sound.hidden = true;
    log("sound on");
  });

  loadYouTubeApi().then((YT) => {
    player = new YT.Player("qc-player", {
      host: "https://www.youtube-nocookie.com",
      videoId: cls.videoId,
      width: "100%",
      height: "100%",
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1, mute: 1, start: startAt, origin: location.origin },
      events: {
        onReady: () => {
          const iframe = player.getIframe && player.getIframe();
          if (iframe) iframe.title = `${cls.title}, AutoStack Quick Class video`;
          log("player ready", { duration: player.getDuration(), startAt });
          // Some phones block even muted autoplay. Then the viewer taps play, and the resume button still helps.
          player.mute();
          player.playVideo();
          sound.hidden = false;
          setTimeout(() => {
            if (startAt && player.getPlayerState() !== YT.PlayerState.PLAYING) {
              resume.hidden = false;
              document.getElementById("qc-resume-btn").textContent = `Continue where you stopped (${fmt(state.maxWatched)})`;
            }
          }, 1500);
        },
        onStateChange: (e) => {
          // The last position is kept across pauses: resuming continues from it, and a seek shows up as a jump.
          poll();
          if (e.data === YT.PlayerState.PLAYING) {
            if (!timer) timer = setInterval(poll, 1000);
          } else {
            clearInterval(timer);
            timer = null;
          }
        },
      },
    });
  });

  document.getElementById("qc-resume-btn").addEventListener("click", () => {
    if (!player || !player.seekTo) return;
    player.seekTo(Math.max(0, state.maxWatched - 2), true);
    player.playVideo();
    resume.hidden = true;
  });

  // Coming back to a background tab: take a reading straight away.
  document.addEventListener("visibilitychange", () => { if (!document.hidden && timer) poll(); });

  if (DEBUG) {
    document.getElementById("qc-debug").hidden = false;
    document.getElementById("qc-debug-jump").addEventListener("click", () => {
      // Test only: count everything up to 5 seconds before the pitch as watched, then play from there.
      const at = Math.max(0, pitch - 5);
      state = { maxWatched: Math.max(state.maxWatched, at), last: at };
      store.set(K.max, state.maxWatched.toFixed(1));
      log("debug: jumped to", at);
      if (player && player.seekTo) { player.seekTo(at, true); player.playVideo(); }
      showState();
    });
    document.getElementById("qc-debug-reset").addEventListener("click", () => {
      for (const k of [K.max, K.revealed, K.sent, K.px(25), K.px(50), K.px(75)]) store.del(k);
      log("debug: reset, reloading");
      location.reload();
    });
    showState();
  }
}

const form = document.getElementById("qc-register");
if (form) {
  initRegister(form);
  initModal(document.getElementById("register"), form);
}
const data = document.getElementById("qc-data");
if (data) initWatch(data);
