// voice-input.js — v0.40.0 stub, v0.42.1 honest disabled signal.
//
// The previous implementation transcribed Telegram voice notes via
// Gemini 2.5 Flash's audio inline-data input. The migration to Anthropic
// (v0.40.0) drops audio support — Claude's Messages API does not accept
// audio attachments. To re-enable voice intent classification, pipe the
// OGG/Opus payload through a dedicated speech-to-text service (Whisper,
// AssemblyAI, Deepgram) and feed the transcript into nl-intent.classifyIntent.
//
// v0.42.1 (B1): added isAvailable() so the index.js voice handler can
// short-circuit BEFORE sending a misleading "🎙 transcribing…" tease.
// classifyVoice() still returns null for the contract, with an explicit
// `disabled: true` shape so the handler can branch on it.
//
// MIN_CONFIDENCE / MAX_DURATION_S stay so callers that import them keep
// compiling.

const MIN_CONFIDENCE = 0.6;
const MAX_DURATION_S = 90;

// True when an audio-capable transcription provider is wired in. Today
// always false — flip when Whisper / AssemblyAI / Deepgram is plumbed.
function isAvailable() {
  return false;
}

async function classifyVoice() {
  return { disabled: true, reason: 'voice_transcription_unavailable' };
}

module.exports = { classifyVoice, isAvailable, MIN_CONFIDENCE, MAX_DURATION_S };
