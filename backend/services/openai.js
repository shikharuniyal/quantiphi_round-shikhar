const OpenAI = require("openai");
const config = require("../config/config");
const { getSystemInstruction } = require("./tone");
const { mockStream } = require("./mockAI");

const client = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
});

// builds the messages array: system message first, then old messages
function buildMessages(history, tone) {
  const messages = [{ role: "system", content: getSystemInstruction(tone) }];

  // only send the last few messages so the request stays small
  const recent = history.slice(-config.maxHistoryMessages);
  for (const m of recent) {
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

// returns a stream of chunks from OpenAI
async function streamReply(history, tone) {
  if (config.useMockAI) {
    return mockStream(history, tone);
  }

  return client.chat.completions.create({
    model: config.openaiModel,
    messages: buildMessages(history, tone),
    stream: true,
  });
}

module.exports = { streamReply, buildMessages };
