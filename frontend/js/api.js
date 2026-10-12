// All calls to the backend are kept in this file.
// The frontend is served by the same server, so no base URL is needed.

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function getTones() {
  return getJson("/api/tones");
}

function getConversations(searchText) {
  return getJson("/api/conversations?q=" + encodeURIComponent(searchText || ""));
}

function getConversation(id) {
  return getJson("/api/conversations/" + id);
}

async function deleteConversation(id) {
  const res = await fetch("/api/conversations/" + id, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Could not delete chat");
  }
}

// Sends a POST and reads the SSE stream.
// onEvent is called for every event: {text}, {done}, or {error}
async function postStream(url, body, onEvent) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // validation errors come back as normal JSON, not as a stream
  if (!res.ok) {
    const data = await res.json();
    onEvent({ error: data.error || "Request failed" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop(); // keep the unfinished part for the next round

    for (const event of events) {
      if (event.startsWith("data: ")) {
        onEvent(JSON.parse(event.slice(6)));
      }
    }
  }
}

function sendChat(conversationId, message, tone, onEvent) {
  return postStream("/api/chat", { conversationId, message, tone }, onEvent);
}

function regenerateChat(conversationId, tone, onEvent) {
  return postStream("/api/chat/regenerate", { conversationId, tone }, onEvent);
}
