const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const config = require("../config/config");
const { streamReply } = require("../services/openai");
const { isValidTone } = require("../services/tone");

const router = express.Router();

// sends one event to the client in SSE format
function sendEvent(res, data) {
  res.write("data: " + JSON.stringify(data) + "\n\n");
}

// turns an OpenAI error into a message that is safe to show the user
function getErrorMessage(err) {
  if (err.status === 401) {
    return "Server API key problem.";
  }
  if (err.status === 429) {
    return "Too many requests or OpenAI quota finished. Try again later.";
  }
  return "Something went wrong. Please try again.";
}

// asks OpenAI for a reply, streams it to the client and saves it in MongoDB
async function streamAndSave(res, conversation, tone) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // stop reading if the client closes the connection
  let clientLeft = false;
  res.on("close", () => {
    clientLeft = true;
  });

  let fullReply = "";
  let errorMessage = "";

  try {
    const stream = await streamReply(conversation.messages, tone);
    for await (const chunk of stream) {
      if (clientLeft) {
        break;
      }
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullReply += text;
        sendEvent(res, { text: text });
      }
    }
  } catch (err) {
    console.error("OpenAI error:", err.message);
    errorMessage = getErrorMessage(err);
  }

  // save the AI reply (the user message is saved even if the AI failed)
  if (fullReply !== "") {
    conversation.messages.push({ role: "assistant", content: fullReply, tone: tone });
  }
  await conversation.save();

  if (clientLeft) {
    return;
  }
  if (errorMessage) {
    sendEvent(res, { error: errorMessage, conversationId: conversation._id });
  } else {
    sendEvent(res, { done: true, conversationId: conversation._id, title: conversation.title });
  }
  res.end();
}

// POST /api/chat
// body: { conversationId (optional), message, tone (optional) }
router.post("/", async (req, res) => {
  const { conversationId, message } = req.body;
  let tone = req.body.tone;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message is required" });
  }
  if (message.length > config.maxMessageLength) {
    return res.status(400).json({ error: "message is too long (max " + config.maxMessageLength + " characters)" });
  }
  if (!isValidTone(tone)) {
    tone = "professional";
  }

  try {
    // find the old conversation or create a new one
    let conversation;
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: "invalid conversationId" });
      }
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "conversation not found" });
      }
    } else {
      conversation = new Conversation({ title: message.trim().slice(0, 40) });
    }

    conversation.messages.push({ role: "user", content: message.trim(), tone: tone });

    await streamAndSave(res, conversation, tone);
  } catch (err) {
    console.error("chat error:", err.message);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }
});

// POST /api/chat/regenerate  (extra feature)
// body: { conversationId, tone (optional) }
// throws away the last AI reply and writes a new one, in the tone given
router.post("/regenerate", async (req, res) => {
  const { conversationId } = req.body;
  let tone = req.body.tone;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({ error: "invalid conversationId" });
  }
  if (!isValidTone(tone)) {
    tone = "professional";
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "conversation not found" });
    }

    // remove the last AI reply if there is one
    const last = conversation.messages[conversation.messages.length - 1];
    if (last && last.role === "assistant") {
      conversation.messages.pop();
    }

    if (conversation.messages.length === 0) {
      return res.status(400).json({ error: "nothing to regenerate" });
    }

    await streamAndSave(res, conversation, tone);
  } catch (err) {
    console.error("regenerate error:", err.message);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }
});

module.exports = router;
