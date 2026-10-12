# quantiphi_round-shikhar

AI Chat Assistant: a chat app with streaming replies, saved history and a tone toggle.

- **Frontend:** plain HTML, CSS and JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)
- **AI:** OpenAI Chat Completions API

## Features

| Requirement | How it is done |
|-------------|----------------|
| Chat interface | Scrollable view, user bubbles on the right (blue), AI bubbles on the left (white) |
| Streaming view | Backend streams the OpenAI reply over SSE; the frontend types it character by character |
| History sidebar | Past chats listed newest first; click one to open it |
| API integration | Backend calls OpenAI `POST /v1/chat/completions` with `stream: true` |
| Persistence | MongoDB stores each conversation with user prompt, AI response and timestamps |
| Tone toggle | Professional / Casual / Concise. Backend turns the tone into the `system` message of the OpenAI request |

### Two extra features

1. **Regenerate reply:** rewrites the last AI answer. Change the tone first to get the same answer in a different style.
2. **Search chats:** the search box filters the history by title or by any message text. The search runs on the server.

All logic (validation, tone mapping, search, building the AI request, saving) is on the server. The frontend only shows data and handles clicks.

## Project structure

```
backend/
  server.js               starts Express, connects MongoDB, serves the frontend
  config/config.js        reads secrets and holds settings
  secrets/                API key and DB url (secrets.json is not committed)
  models/Conversation.js  MongoDB schema
  routes/chat.js          POST /api/chat, POST /api/chat/regenerate
  routes/conversations.js list, search, load, delete
  services/openai.js      OpenAI streaming call
  services/tone.js        tone -> system instruction
  services/mockAI.js      demo mode for testing without OpenAI credits
frontend/
  index.html
  css/style.css
  js/api.js               all calls to the backend
  js/app.js               page logic
BACKEND_DESIGN.md         design notes and diagrams
```

## How to run

You need Node.js and MongoDB running on `localhost:27017`.

1. Create the secrets file:

   Copy `backend/secrets/secrets.example.json` to `backend/secrets/secrets.json` and put in your OpenAI key.

   ```json
   {
     "openaiApiKey": "sk-...",
     "mongoUri": "mongodb://127.0.0.1:27017/quantiphi_chat",
     "useMockAI": false
   }
   ```

   Set `"useMockAI": true` to try the app without OpenAI credits. Replies are then canned text marked "Demo mode".

2. Install and start:

   ```
   cd backend
   npm install
   npm start
   ```

3. Open `http://localhost:5000` in the browser.

## How to use

1. Pick a tone at the top right.
2. Type a message and press Enter (Shift+Enter for a new line).
3. The reply streams in. Change the tone any time; the next reply uses it.
4. Click **Regenerate reply in selected tone** to rewrite the last answer.
5. Use the sidebar to open old chats, search them, delete them, or start a new chat.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Server check |
| GET | `/api/tones` | List of tones |
| POST | `/api/chat` | Send a message, stream the reply |
| POST | `/api/chat/regenerate` | Rewrite the last reply |
| GET | `/api/conversations?q=` | List chats, optional search |
| GET | `/api/conversations/:id` | One full chat |
| DELETE | `/api/conversations/:id` | Delete a chat |

More detail is in [backend/README.md](backend/README.md) and [BACKEND_DESIGN.md](BACKEND_DESIGN.md).
