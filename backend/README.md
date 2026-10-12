# AI Chat Assistant: Backend

Express + MongoDB + OpenAI. See [../BACKEND_DESIGN.md](../BACKEND_DESIGN.md) for the design and diagrams.

## Run

1. MongoDB must be running on `localhost:27017`.
2. Copy `secrets/secrets.example.json` to `secrets/secrets.json` and put in your OpenAI key.
3. Start the server:

```
npm install
npm start
```

Server runs on `http://localhost:5000`.

## Secrets

The OpenAI key and MongoDB URL live in `secrets/secrets.json`. This file is in `.gitignore`, so it is never committed. The key is only used on the server and is never sent to the frontend.

## Endpoints for the frontend

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/api/health` | none | `{ "status": "ok" }` |
| GET | `/api/tones` | none | `["professional", "casual", "concise"]` |
| POST | `/api/chat` | `{ conversationId?, message, tone? }` | SSE stream (see below) |
| GET | `/api/conversations` | none | `[{ _id, title, createdAt, updatedAt }]`, newest first |
| GET | `/api/conversations/:id` | none | full conversation with `messages` |
| DELETE | `/api/conversations/:id` | none | `{ "success": true }` |

### `POST /api/chat` stream

Leave out `conversationId` to start a new chat. The last event gives the id to use for the next message.

```
data: {"text":"An "}
data: {"text":"API is..."}
data: {"done":true,"conversationId":"665f...","title":"What is an API?"}
```

If something fails while streaming, the stream ends with:

```
data: {"error":"Too many requests or quota finished. Try again later."}
```

### Reading the stream in the frontend

`EventSource` only supports GET, so use `fetch`:

```js
const res = await fetch("http://localhost:5000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ conversationId, message, tone }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  const events = buffer.split("\n\n");
  buffer = events.pop(); // keep the unfinished part

  for (const event of events) {
    const data = JSON.parse(event.replace("data: ", ""));
    if (data.text) { /* add data.text to the chat bubble */ }
    if (data.done) { /* save data.conversationId */ }
    if (data.error) { /* show data.error */ }
  }
}
```

### Errors (non-stream)

| Status | Meaning |
|--------|---------|
| 400 | `message` missing, or bad id |
| 404 | conversation not found |
| 500 | server or OpenAI problem |
