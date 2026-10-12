const fs = require("fs");
const path = require("path");

// secrets (API key, DB url) are kept in the secrets folder, not in the code
const secretsPath = path.join(__dirname, "..", "secrets", "secrets.json");

if (!fs.existsSync(secretsPath)) {
  console.error("secrets/secrets.json not found. Copy secrets.example.json and fill it in.");
  process.exit(1);
}

const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));

// pick the provider from the key, so changing the key is enough
// OpenAI keys start with "sk-", NVIDIA keys start with "nvapi-"
let defaultBaseUrl = "https://api.openai.com/v1";
let defaultModel = "gpt-4o-mini";
if (secrets.openaiApiKey.startsWith("nvapi-")) {
  defaultBaseUrl = "https://integrate.api.nvidia.com/v1";
  defaultModel = "meta/llama-3.2-11b-vision-instruct";
}

module.exports = {
  openaiApiKey: secrets.openaiApiKey,
  mongoUri: secrets.mongoUri,
  useMockAI: secrets.useMockAI === true, // demo mode without OpenAI credits
  // optional: set these in secrets.json to use another URL or model
  openaiBaseUrl: secrets.openaiBaseUrl || defaultBaseUrl,
  openaiModel: secrets.openaiModel || defaultModel,
  port: 5000,
  maxHistoryMessages: 20, // how many old messages are sent to OpenAI
  maxMessageLength: 4000,
};
