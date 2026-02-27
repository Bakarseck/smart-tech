const express = require("express")
const http = require("http")
const path = require("path")
const bcrypt = require("bcrypt")
const db = require("./db/connection")
const session = require("express-session")
const { Server } = require("socket.io")

const { ExpressPeerServer } = require("peer");

// Créer un serveur PeerJS
const peerServer = ExpressPeerServer(server, { path: '/peerjs' });


const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.json())
app.use('/peerjs', peerServer);
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))

app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false
}))


// Middleware pour protéger les routes
function authMiddleware(req, res, next) {
  if (!req.session.userId) return res.status(401).send("Non autorisé")
  next()
}

app.get("/video.html", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public/video.html"));
});

// Pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")))
app.get("/chat.html", authMiddleware, (req, res) => res.sendFile(path.join(__dirname, "public/chat.html")))

// Authentification
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed],
      (err) => {
        if (err) return res.status(500).send("Erreur inscription")
        res.send("Utilisateur créé")
      }
    )
  } catch (err) {
    res.status(500).send("Erreur serveur")
  }
})

app.post("/login", (req, res) => {
  const { email, password } = req.body
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).send("Erreur serveur")
      if (results.length === 0) return res.status(404).send("Utilisateur introuvable")
      const valid = await bcrypt.compare(password, results[0].password)
      if (!valid) return res.status(401).send("Mot de passe incorrect")
      req.session.userId = results[0].id
      req.session.username = results[0].username
      res.send("Connecté")
    }
  )
})

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if(err) return res.status(500).send("Erreur déconnexion")
    res.clearCookie("connect.sid")
    res.send("Déconnecté")
  })
})

app.get("/getUsername", authMiddleware, (req, res) => {
  res.json({ username: req.session.username });
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("Utilisateur connecté Socket.IO");

  // Quand un utilisateur rejoint, on lui envoie l'historique
  db.query("SELECT * FROM messages ORDER BY created_at ASC", (err, results) => {
    if(!err) {
      results.forEach(msg => {
        socket.emit("chatMessage", { username: msg.username, message: msg.message });
      });
    }
  });

  // Quand un message est reçu
  socket.on("chatMessage", (data) => {
    // Sauvegarde en base
    db.query(
      "INSERT INTO messages (username, message) VALUES (?, ?)",
      [data.username, data.message],
      (err) => {
        if(err) console.log("Erreur sauvegarde message:", err);
      }
    );

    // Diffusion à tous
    io.emit("chatMessage", data);
  });

  // Tableau blanc
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  socket.on("disconnect", () => console.log("Utilisateur déconnecté Socket.IO"));
});

server.listen(3000, () => console.log("Serveur lancé sur http://localhost:3000"))