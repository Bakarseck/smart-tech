const socket = io();

// Déconnexion
document.getElementById("logout").addEventListener("click", async () => {
  const res = await fetch("/logout");
  if(res.ok) window.location.href = "/";
});

// Chat
const chatForm = document.getElementById("chat-form");
const messagesDiv = document.getElementById("messages");

let username = null;

// Récupération username depuis le serveur avant tout
async function getUsername() {
  const res = await fetch("/getUsername");
  if(res.ok) {
    const data = await res.json();
    username = data.username;
  } else {
    alert("Erreur récupération username. Redirection vers login.");
    window.location.href = "/";
  }
}

// Appel dès le chargement
getUsername();

// Soumission du chat
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msgInput = document.getElementById("msg");
  const message = msgInput.value.trim();
  if(!message || !username) return; // bloque si username pas encore chargé

  // Envoi du message avec username
  socket.emit("chatMessage", { username, message });

  msgInput.value = "";
  msgInput.focus();
});

// Réception des messages
socket.on("chatMessage", (data) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(data.username === username ? "self" : "other");

  const span = document.createElement("div");
  span.classList.add("message-username");
  span.textContent = data.username;

  const text = document.createElement("div");
  text.textContent = data.message;

  div.appendChild(span);
  div.appendChild(text);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Tableau blanc
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
let drawing = false;

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  if(!drawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  socket.emit("draw", { x: e.offsetX, y: e.offsetY });
});

canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mouseleave", () => drawing = false);

socket.on("draw", (data) => {
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
});