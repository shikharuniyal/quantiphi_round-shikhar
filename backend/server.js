const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config/config");
const { tones } = require("./services/tone");

const chatRoutes = require("./routes/chat");
const conversationRoutes = require("./routes/conversations");

const app = express();

app.use(cors()); // lets the frontend call this backend from another port
app.use(express.json());

// simple check that the server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// list of tones for the frontend toggle
app.get("/api/tones", (req, res) => {
  res.json(Object.keys(tones));
});

app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);

// serve the frontend files from the same server
app.use(express.static(path.join(__dirname, "..", "frontend")));

mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(config.port, () => {
      console.log("Server running on http://localhost:" + config.port);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
