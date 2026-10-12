const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");

const router = express.Router();

// GET /api/conversations  -> list for the sidebar (without messages)
// GET /api/conversations?q=word  -> only chats that contain the word (extra feature)
router.get("/", async (req, res) => {
  try {
    let filter = {};
    const q = (req.query.q || "").toString().trim();
    if (q !== "") {
      // escape special characters so the text is searched as plain text
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      filter = { $or: [{ title: regex }, { "messages.content": regex }] };
    }

    const list = await Conversation.find(filter)
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "could not load conversations" });
  }
});

// GET /api/conversations/:id  -> one full conversation
router.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: "conversation not found" });
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: "could not load conversation" });
  }
});

// DELETE /api/conversations/:id
router.delete("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const deleted = await Conversation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "conversation not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "could not delete conversation" });
  }
});

module.exports = router;
