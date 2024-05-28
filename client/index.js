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
    const messageText = input.value.trim();
    if (messageText) {
      const message = { text: messageText };
      ws.send(JSON.stringify(message));
      input.value = ""; // Clear the input field
    }
  });

  function displayMessages(messages, append = false) {
    if (!append) {
      messageContainer.innerHTML = "";
    }
    messages.forEach((msg) => {
      const messageElement = document.createElement("p");
      messageElement.textContent = msg.text;
      messageContainer.appendChild(messageElement);
    });
  }
});
