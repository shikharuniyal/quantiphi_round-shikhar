// tone name -> system instruction sent to OpenAI
const tones = {
  professional:
    "You are a helpful assistant. Reply in a formal, professional tone with clear and well-structured sentences.",
  casual:
    "You are a helpful assistant. Reply in a friendly, casual tone like talking to a friend.",
  concise:
    "You are a helpful assistant. Reply as briefly as possible. Use at most 2 to 3 short sentences.",
};

function isValidTone(tone) {
  return tones[tone] !== undefined;
}

// unknown or missing tone falls back to professional
function getSystemInstruction(tone) {
  if (isValidTone(tone)) {
    return tones[tone];
  }
  return tones.professional;
}

module.exports = { tones, isValidTone, getSystemInstruction };
