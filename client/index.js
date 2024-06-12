document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("message-form");
  const input = document.getElementById("input");
  const messageContainer = document.getElementById("messages");
  const userIdInput = document.getElementById("user-id");
  const chatTitle = document.getElementById("chat-title");
  const emojiButton = document.getElementById('emoji-button');
  const emojiList = document.getElementById('emoji-list');


  emojiButton.textContent = '😊';
  emojiButton.classList.add('button', 'is-rounded', 'is-small');
  form.appendChild(emojiButton);


  let ws;
  let targetUserId = null;
  let emojis = [];


  async function loadEmojis() {
    try {
      //sendet HTTP Req und gibt Promise zurück; welches auf Antwort wartet + Req an Endpunkt /emoji gesendet
      //'await' wartet das Promis der Fetch Funktion aufgelöst wird; Code haltet an bis Anfrage abgeschlossen
      const response = await fetch(`/emoji`);
      emojis = await response.json();                           //Wartet das PRomise aufgelöst wird und JSON Objekt zurück gibt
      displayEmojis();                                          //Zeigt dann Emojis an
    } catch (error) {
      console.error('Error fetching emojis:', error);
    }
  }

  await loadEmojis();       //asynchrone Funktion loadEmojis aufgerufen und wartet, dass die Funktion abgeschlossen wird, bevor der Code weiter ausgeführt wird


  function connectWebSocket(userId) {
    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      ws.close();
    }
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.addEventListener("open", () => {
      console.log("WebSocket connection opened");
      ws.send(JSON.stringify({type: "init", userId}));
    });

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        // Initial messages are ignored for now
      } else if (data.type === "direct") {
        // Only display messages from the current chat
        if (data.fromUserId === targetUserId || data.toUserId === targetUserId) {
          displayMessages([{text: `${data.fromUserId}: ${data.text}`, timestamp: data.timestamp}], true);
        }
      }
    });

    ws.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });

    ws.addEventListener("close", () => {
      console.log("WebSocket connection closed");
    });
  }

  userIdInput.addEventListener("change", () => {
    const userId = userIdInput.value.trim();
    if (userId) {
      connectWebSocket(userId);
      usernameLink.href = `profile.html?userId=${userId}&username=Username`;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const userId = userIdInput.value.trim();
    const messageText = input.value.trim();

    if (messageText && userId && targetUserId && ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "direct",
        toUserId: targetUserId,
        text: messageText,
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(message));
      input.value = "";
      displayMessages([{text: `You: ${messageText}`, timestamp: Date.now()}], true);
    }
  });

  function displayMessages(messages, append = false) {
    if (!append) {
      messageContainer.innerHTML = "";
    }
    messages.forEach((msg) => {
      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("message-bubble", "box");
      if (msg.fromUserId === userIdInput.value) {
        messageWrapper.classList.add("you");
      }
      const messageText = document.createElement("p");
      messageText.classList.add("text");
      messageText.textContent = msg.text.startsWith("You: ") ? `${userIdInput.value}: ${msg.text.substring(5)}` : msg.text;

      messageWrapper.append(messageText);
      messageContainer.prepend(messageWrapper);
    });
  }

  document.querySelectorAll(".menu-list a").forEach(chatLink => {
    chatLink.addEventListener("click", (event) => {
      event.preventDefault();
      chatTitle.textContent = event.target.textContent;
      targetUserId = event.target.getAttribute("data-user-id");
      loadChatMessages(targetUserId);
    });
  });

  function loadChatMessages(userId) {
    messageContainer.innerHTML = "";
    // For now, this function does nothing.
    // You could fetch messages from the server here if needed.
  }

  emojiButton.addEventListener('click', (event) => {
    //prüft ob Emoji im Array vorhanden
    if (emojis.length > 0) {
      //zeigt nur aktuelle Emojis an (fall doppelter Klick auf Button)
      emojiList.innerHTML = '';
      //durchlaufen Array; fügen für jedes Emoji ein option-Element in die Emoji-Liste (datalist) ein
      //ermöglicht aus aktualisierten Liste auszuwählen
      emojis.forEach(emoji => {
        emojiList.insertAdjacentHTML('beforeend', `<option value="${emoji.character}"></option>`);
      });
      //Nach dem Aktualisieren der Liste wird der Fokus auf das Eingabefeld gesetzt
      input.focus();
    }
  });

});


