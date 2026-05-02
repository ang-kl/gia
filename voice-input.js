// voice-input.js — v0.40.0 stub.
//
// The previous implementation transcribed Telegram voice notes via
// Gemini 2.5 Flash's audio inline-data input. The migration to Anthropic
// (v0.40.0) drops audio support — Claude's Messages API does not accept
// audio attachments. To re-enable voice intent classification, pipe the
// OGG/Opus payload through a dedicated speech-to-text service (Whisper,
// AssemblyAI, Deepgram) and feed the transcript into nl-intent.classifyIntent.
//
// Contract preserved: classifyVoice() returns null so the index.js
// voice-message handler logs "voice-disabled" and replies with a polite
// fallback. The MIN_CONFIDENCE / MAX_DURATION_S exports stay so callers
// that import them keep compiling.

const MIN_CONFIDENCE = 0.6;
const MAX_DURATION_S = 90;

async function classifyVoice() {
  return null;
}

module.exports = { classifyVoice, MIN_CONFIDENCE, MAX_DURATION_S };
