// Demo mode: used only when "useMockAI" is true in secrets.json.
// It lets the app be tested without OpenAI credits.
// It gives chunks in the same shape as the OpenAI stream.

const replies = {
  professional:
    "[Demo mode, not a real AI reply] Thank you for your message. I have received your query and would be pleased to assist you with a detailed and structured response.",
  casual:
    "[Demo mode, not a real AI reply] Hey! Got your message, sounds fun. Happy to help you out with that, just say the word!",
  concise: "[Demo mode, not a real AI reply] Got it. Happy to help.",
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* mockStream(history, tone) {
  const lastMessage = history[history.length - 1].content;
  const reply = replies[tone] + ' You said: "' + lastMessage + '"';

  const words = reply.split(" ");
  for (const word of words) {
    await wait(40);
    yield { choices: [{ delta: { content: word + " " } }] };
  }
}

module.exports = { mockStream };
