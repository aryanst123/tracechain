const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// Get demands
router.get("/", (req, res) => {
  let query, params;
  if (req.user.role === "industry") {
    query = `SELECT d.*, u.name as industry_name FROM demands d LEFT JOIN users u ON d.industry_id=u.id WHERE d.industry_id=? ORDER BY d.created_at DESC`;
    params = [req.user.id];
  } else {
    query = `SELECT d.*, u.name as industry_name FROM demands d LEFT JOIN users u ON d.industry_id=u.id ORDER BY d.created_at DESC`;
    params = [];
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Post demand
router.post("/", (req, res) => {
  const { material, quantity_kg, price_per_kg } = req.body;
  if (!material || !quantity_kg || !price_per_kg)
    return res.status(400).json({ error: "All fields required" });

  const id = randomUUID();
  db.run(
    `INSERT INTO demands (id,industry_id,material,quantity_kg,price_per_kg,status) VALUES (?,?,?,?,?,?)`,
    [id, req.user.id, material, quantity_kg, price_per_kg, "open"],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Check for available lots
      db.all(
        `SELECT * FROM lots WHERE material=? AND status='available' AND total_weight_kg >= ?`,
        [material, quantity_kg],
        (e, lots) => {
          if (!e && lots.length) {
            const match_id = randomUUID();
            db.run(
              `INSERT INTO matches (id,lot_id,demand_id,status) VALUES (?,?,?,?)`,
              [match_id, lots[0].id, id, "pending"],
            );
            db.run(`UPDATE lots SET status='matched' WHERE id=?`, [lots[0].id]);
            db.run(`UPDATE demands SET status='matched' WHERE id=?`, [id]);
          }
        },
      );
      db.get("SELECT * FROM demands WHERE id=?", [id], (e, row) =>
        res.json(row),
      );
    },
  );
});

// Get matches
router.get("/matches", (req, res) => {
  db.all(
    `SELECT m.*, l.lot_code, l.material, l.total_weight_kg, d.price_per_kg,
            u1.name as aggregator_name, u2.name as industry_name
     FROM matches m
     LEFT JOIN lots l ON m.lot_id=l.id
     LEFT JOIN demands d ON m.demand_id=d.id
     LEFT JOIN users u1 ON l.aggregator_id=u1.id
     LEFT JOIN users u2 ON d.industry_id=u2.id
     ORDER BY m.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

module.exports = router;
