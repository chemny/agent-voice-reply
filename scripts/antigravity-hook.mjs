#!/usr/bin/env node
// Codex Voice Reply — Antigravity Hook Adapter.
//
// Hooks into Antigravity client lifecycle:
// - PreInvocation: Speaks immediate opening cue ("好，这就做" / "我看看" / "收到") upon user task submission.
// - Stop: Speaks the final voice marker <!-- voice: ... --> or completion summary.
//
// Complies with Antigravity hook contracts:
// - Reads stdin context (JSON with transcriptPath, invocationNum, etc.)
// - Always outputs valid JSON to stdout (e.g. {}) so the client never blocks/fails.
// - Background detached audio playback (~50ms return).

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRotatingLog,
  playOpening,
  extractVoiceMarker,
  clampSpoken,
  detectContentLang,
  resolveVoice,
  playDetached,
} from "./opening.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const speakScript = join(__dirname, "speak.mjs");
const LOG = join(homedir(), ".voice-reply", "antigravity-hook.log");
const HOOKS_CONFIG = join(homedir(), ".voice-reply", "hooks.json");
const CONFIG_FILE = join(homedir(), ".voice-reply", "config.json");

function log(record) {
  appendRotatingLog(LOG, record);
}

function loadConfig() {
  try {
    return JSON.parse(readFileSync(HOOKS_CONFIG, "utf8"));
  } catch {
    return {};
  }
}

function loadVoices() {
  let cfg = {};
  try {
    cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    cfg = {};
  }
  return {
    zh: cfg.voice || "zh-CN-YunxiNeural",
    en: cfg.voiceEn || "en-US-GuyNeural",
  };
}

function readStdinJson() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return {};
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readTranscriptLastMessages(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return { lastUser: "", lastAssistant: "" };
  }
  try {
    const lines = readFileSync(transcriptPath, "utf8").trim().split("\n");
    let lastUser = "";
    let lastAssistant = "";
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (!lastAssistant && obj.type === "PLANNER_RESPONSE" && obj.content) {
          lastAssistant = obj.content;
        }
        if (!lastUser && obj.type === "USER_INPUT" && obj.content) {
          lastUser = obj.content;
        }
        if (lastUser && lastAssistant) break;
      } catch {
        // ignore unparseable line
      }
    }
    return { lastUser, lastAssistant };
  } catch (err) {
    log({ error: `readTranscriptError: ${err.message}` });
    return { lastUser, lastAssistant: "" };
  }
}

function speak(text, voices, config) {
  const maxChars = Number(config.maxResultChars) || 60;
  const spoken = clampSpoken(text, maxChars);
  const lang = detectContentLang(spoken);
  const voice = resolveVoice(voices, lang);
  log({ did: "speak", text: spoken, voice, lang });

  if (process.env.VOICE_REPLY_DRY_RUN === "1") {
    return;
  }
  playDetached(process.execPath, [speakScript, "text", "--text", spoken, "--full"], voice ? { VOICE_REPLY_VOICE: voice } : undefined);
}

function main() {
  const input = readStdinJson();
  const config = loadConfig();
  const voices = loadVoices();

  // Determine event: CLI arg or infer from input keys
  let event = process.argv[2] || "";
  if (!event) {
    if (input.terminationReason !== undefined || input.fullyIdle !== undefined) {
      event = "Stop";
    } else if (input.invocationNum !== undefined) {
      event = "PreInvocation";
    }
  }

  log({
    event,
    invocationNum: input.invocationNum,
    conversationId: input.conversationId,
    transcriptPath: input.transcriptPath,
  });

  try {
    if (config.enabled !== false) {
      const transcriptPath = input.transcriptPath || "";
      const { lastUser, lastAssistant } = readTranscriptLastMessages(transcriptPath);

const SILENT_AGENT_MARKER = /(?:\[|<)voice-silent-subagent(?:\]|>)/i;

function isSubagentSession(lastUser) {
  if (!lastUser) return false;
  // Explicit silent marker
  if (SILENT_AGENT_MARKER.test(lastUser)) return true;
  // In Antigravity, direct user prompts always contain <USER_REQUEST>.
  // Subagent tasks dispatched internally do not have <USER_REQUEST>.
  if (!lastUser.includes("<USER_REQUEST>")) return true;
  return false;
}

function cleanUserPrompt(text) {
  if (!text) return "";
  const match = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  const raw = match ? match[1] : text;
  return raw
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, "")
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, "")
    .trim();
}

      // Suppress subagents: only root user sessions should speak
      if (isSubagentSession(lastUser)) {
        log({ did: "suppressed-subagent", event });
        return;
      }

      if (event === "PreInvocation" && config.start !== false) {
        // Antigravity invocationNum is 0-indexed: 0 indicates the start of a user request turn
        const isFirstInvocation = input.invocationNum === 0 || input.invocationNum === undefined;
        const prompt = cleanUserPrompt(lastUser);
        if (isFirstInvocation && prompt) {
          const cue = playOpening({ prompt }, voices);
          log({ did: "open", cue: cue.key, lang: cue.lang, prompt: prompt.slice(0, 30) });
        }
      } else if (event === "Stop" && config.stop !== false) {
        // Speak voice marker or completion fallback
        const marker = extractVoiceMarker(lastAssistant);
        if (marker) {
          log({ did: "marker", marker });
          speak(marker, voices, config);
        } else {
          const fallback = config.texts?.Stop || "已完成，请查看结果。";
          log({ did: "no-marker-fallback", fallback });
          speak(fallback, voices, config);
        }
      }
    }
  } catch (err) {
    log({ error: `handlerError: ${err.message}` });
  } finally {
    // Antigravity contract: always emit valid JSON to stdout
    process.stdout.write(JSON.stringify({}) + "\n");
  }
}

main();
