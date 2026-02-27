const mysql = require("mysql2")

const db = mysql.createConnection({
  host: "localhost",
  user: "smartuser",
  password: "tonpassword",
  database: "smarttech"
})

db.connect(err => {
  if (err) {
    console.error("Erreur BDD:", err)
  } else {
    console.log("Connecté à MySQL")
  }
})

module.exports = db;