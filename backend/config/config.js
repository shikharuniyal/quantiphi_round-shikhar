const fs = require("fs");
const path = require("path");

// secrets (API key, DB url) are kept in the secrets folder, not in the code
const secretsPath = path.join(__dirname, "..", "secrets", "secrets.json");

if (!fs.existsSync(secretsPath)) {
  console.error("secrets/secrets.json not found. Copy secrets.example.json and fill it in.");
  process.exit(1);
}

const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));

module.exports = {
  openaiApiKey: secrets.openaiApiKey,
  mongoUri: secrets.mongoUri,
  useMockAI: secrets.useMockAI === true, // demo mode without OpenAI credits
  openaiModel: "gpt-4o-mini",
  port: 5000,
  maxHistoryMessages: 20, // how many old messages are sent to OpenAI
  maxMessageLength: 4000,
};
