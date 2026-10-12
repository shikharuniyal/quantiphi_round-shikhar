const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  tone: { type: String, default: "professional" },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "New chat" },
    messages: [messageSchema],
  },
  { timestamps: true } // adds createdAt and updatedAt
);

module.exports = mongoose.model("Conversation", conversationSchema);
