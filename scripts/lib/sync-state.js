// Remembers what the last Notion sync wrote, so we can tell if you edited a post locally.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { ROOT } from "./util.js";

const FILE = path.join(ROOT, "content", ".sync-state.json");

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + "\n");
}

export function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

/** Ask a yes/no question. Without a terminal (CI, piped input) the answer is always no. */
export async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}
