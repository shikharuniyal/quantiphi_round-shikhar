const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const { streamReply } = require("../services/openai");
const { isValidTone } = require("../services/tone");

const router = express.Router();

// sends one event to the client in SSE format
function sendEvent(res, data) {
  res.write("data: " + JSON.stringify(data) + "\n\n");
}

// POST /api/chat
// body: { conversationId (optional), message, tone (optional) }
router.post("/", async (req, res) => {
  const { conversationId, message } = req.body;
  let tone = req.body.tone;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "message is required" });
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

    // add the user message
    conversation.messages.push({ role: "user", content: message.trim(), tone: tone });

    // headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // stop reading if the client closes the connection
    let clientLeft = false;
    res.on("close", () => {
      clientLeft = true;
    });

    const stream = await streamReply(conversation.messages, tone);

    let fullReply = "";
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

    // save the AI reply
    if (fullReply !== "") {
      conversation.messages.push({ role: "assistant", content: fullReply, tone: tone });
    }
    await conversation.save();

    if (!clientLeft) {
      sendEvent(res, { done: true, conversationId: conversation._id, title: conversation.title });
      res.end();
    }
  } catch (err) {
    console.error("chat error:", err.message);

    let errorMessage = "Something went wrong. Please try again.";
    if (err.status === 401) {
      errorMessage = "Server API key problem.";
    } else if (err.status === 429) {
      errorMessage = "Too many requests or quota finished. Try again later.";
    }

    // headers may already be sent if the error happened while streaming
    if (res.headersSent) {
      sendEvent(res, { error: errorMessage });
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
});

module.exports = router;
