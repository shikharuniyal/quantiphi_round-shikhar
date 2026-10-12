// ---------- page elements ----------
const historyList = document.getElementById("historyList");
const searchInput = document.getElementById("searchInput");
const newChatBtn = document.getElementById("newChatBtn");
const chatTitle = document.getElementById("chatTitle");
const toneButtons = document.getElementById("toneButtons");
const messagesBox = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const regenerateBtn = document.getElementById("regenerateBtn");

// ---------- state ----------
let currentId = null; // id of the open conversation
let currentTone = "professional";
let isBusy = false; // true while the AI is replying

// ---------- small helpers ----------
function formatTime(dateText) {
  return new Date(dateText).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scrollToBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function setBusy(busy) {
  isBusy = busy;
  sendBtn.disabled = busy;
  regenerateBtn.disabled = busy;
}

function showWelcome() {
  messagesBox.innerHTML = '<div class="welcome">Pick a tone and send a message to start.</div>';
}

// ---------- messages ----------
// adds one chat bubble and returns the bubble element
function addMessage(role, content, tone, time) {
  const welcome = messagesBox.querySelector(".welcome");
  if (welcome) {
    welcome.remove();
  }

  const wrapper = document.createElement("div");
  wrapper.className = "message " + role;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  const meta = document.createElement("div");
  meta.className = "meta";
  if (role === "assistant") {
    meta.textContent = "AI · " + tone + " · " + formatTime(time);
  } else if (role === "user") {
    meta.textContent = "You · " + formatTime(time);
  }

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  messagesBox.appendChild(wrapper);
  scrollToBottom();
  return bubble;
}

// ---------- tone toggle ----------
async function loadTones() {
  const tones = await getTones();
  toneButtons.innerHTML = "";

  for (const tone of tones) {
    const btn = document.createElement("button");
    btn.className = "tone-btn";
    btn.textContent = tone;
    if (tone === currentTone) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentTone = tone;
      for (const b of toneButtons.children) {
        b.classList.remove("active");
      }
      btn.classList.add("active");
    });
    toneButtons.appendChild(btn);
  }
}

// ---------- history sidebar ----------
async function loadHistory() {
  const list = await getConversations(searchInput.value);
  historyList.innerHTML = "";

  if (list.length === 0) {
    historyList.innerHTML = '<li class="empty-text">No chats found</li>';
    return;
  }

  for (const chat of list) {
    const item = document.createElement("li");
    item.className = "history-item";
    if (chat._id === currentId) {
      item.classList.add("active");
    }

    const text = document.createElement("div");
    text.className = "history-text";

    const title = document.createElement("div");
    title.className = "history-title";
    title.textContent = chat.title;

    const date = document.createElement("div");
    date.className = "history-date";
    date.textContent = formatTime(chat.updatedAt);

    text.appendChild(title);
    text.appendChild(date);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "×";
    del.title = "Delete chat";
    del.addEventListener("click", async (e) => {
      e.stopPropagation(); // do not open the chat when deleting it
      if (!confirm("Delete this chat?")) {
        return;
      }
      await deleteConversation(chat._id);
      if (chat._id === currentId) {
        startNewChat();
      }
      loadHistory();
    });

    item.appendChild(text);
    item.appendChild(del);
    item.addEventListener("click", () => openChat(chat._id));
    historyList.appendChild(item);
  }
}

async function openChat(id) {
  if (isBusy) {
    return;
  }
  const chat = await getConversation(id);
  currentId = chat._id;
  chatTitle.textContent = chat.title;

  messagesBox.innerHTML = "";
  for (const m of chat.messages) {
    addMessage(m.role, m.content, m.tone, m.timestamp);
  }
  if (chat.messages.length === 0) {
    showWelcome();
  }

  regenerateBtn.hidden = chat.messages.length === 0;
  loadHistory();
}

function startNewChat() {
  if (isBusy) {
    return;
  }
  currentId = null;
  chatTitle.textContent = "New chat";
  regenerateBtn.hidden = true;
  showWelcome();
  loadHistory();
  messageInput.focus();
}

// ---------- streaming ----------
// Shows the AI reply one character at a time.
// streamFunction is sendChat or regenerateChat with its arguments already filled in.
async function showStreamedReply(streamFunction) {
  setBusy(true);

  const tone = currentTone;
  const bubble = addMessage("assistant", "", tone, new Date());
  bubble.classList.add("typing");

  let queue = ""; // text received but not shown yet
  let finished = false;
  let errorText = "";

  // types one character every few milliseconds
  const timer = setInterval(() => {
    if (queue.length > 0) {
      // type faster when a lot of text is waiting
      const count = queue.length > 200 ? 5 : 1;
      bubble.textContent += queue.slice(0, count);
      queue = queue.slice(count);
      scrollToBottom();
    } else if (finished) {
      clearInterval(timer);
      bubble.classList.remove("typing");

      if (errorText) {
        if (bubble.textContent === "") {
          bubble.parentElement.remove();
        }
        const errorBubble = addMessage("assistant error", errorText, tone, new Date());
        errorBubble.parentElement.querySelector(".meta").textContent = "Error";
      }

      regenerateBtn.hidden = currentId === null;
      setBusy(false);
      loadHistory();
    }
  }, 12);

  try {
    await streamFunction((event) => {
      if (event.text) {
        queue += event.text;
      }
      if (event.conversationId) {
        currentId = event.conversationId;
      }
      if (event.title) {
        chatTitle.textContent = event.title;
      }
      if (event.error) {
        errorText = event.error;
      }
    });
  } catch (err) {
    errorText = "Could not reach the server.";
  }
  finished = true;
}

// ---------- events ----------
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message === "" || isBusy) {
    return;
  }

  addMessage("user", message, currentTone, new Date());
  messageInput.value = "";

  showStreamedReply((onEvent) => sendChat(currentId, message, currentTone, onEvent));
});

// Enter sends the message, Shift+Enter makes a new line
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

regenerateBtn.addEventListener("click", () => {
  if (isBusy || currentId === null) {
    return;
  }

  // remove the old AI reply (and any error bubble) from the screen
  while (messagesBox.lastElementChild && messagesBox.lastElementChild.classList.contains("assistant")) {
    messagesBox.lastElementChild.remove();
  }

  showStreamedReply((onEvent) => regenerateChat(currentId, currentTone, onEvent));
});

newChatBtn.addEventListener("click", startNewChat);

// search while typing
searchInput.addEventListener("input", loadHistory);

// ---------- start ----------
showWelcome();
loadTones();
loadHistory();
