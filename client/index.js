document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("message-form");
  const input = document.getElementById("input");
  const messageContainer = document.getElementById("messages");

  // Create WebSocket connection
  const ws = new WebSocket(`ws://${window.location.host}`);

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "init") {
      // Initial messages
      displayMessages(data.messages);
    } else if (data.type === "update") {
      // New message
      displayMessages([data.message], true);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const now = new Date();

    const messageText = input.value.trim();
    if (messageText) {
      const message = { text: messageText, timestamp: now.getTime() };
      ws.send(JSON.stringify(message));
      input.value = "";
    }
  });

  function displayMessages(messages, append = false) {
    if (!append) {
      messageContainer.innerHTML = "";
    }

    messages.forEach((msg) => {
      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("message");

      const messageText = document.createElement("p");
      messageText.classList.add("text");
      messageText.textContent = msg.text;

      const messageTimestamp = document.createElement("p");
      messageTimestamp.classList.add("timestamp");
      messageTimestamp.textContent = formatTimestamp(msg.timestamp);

      messageWrapper.appendChild(messageText);
      messageWrapper.appendChild(messageTimestamp);

      messageContainer.appendChild(messageWrapper);
    });
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleTimeString([], options);
  }
});
