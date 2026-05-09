const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

function logAudit(batchId, lotId, actorId, actorRole, action, details, weight) {
  db.run(
    `INSERT INTO audit_log (id,batch_id,lot_id,actor_id,actor_role,action,details,weight_kg) VALUES (?,?,?,?,?,?,?,?)`,
    [randomUUID(), batchId, lotId, actorId, actorRole, action, details, weight],
  );
}

// Get lots
router.get("/", (req, res) => {
  let query, params;
  if (req.user.role === "aggregator") {
    query = `SELECT l.*, u1.name as aggregator_name, u2.name as industry_name 
             FROM lots l LEFT JOIN users u1 ON l.aggregator_id=u1.id LEFT JOIN users u2 ON l.industry_id=u2.id
             WHERE l.aggregator_id=? ORDER BY l.created_at DESC`;
    params = [req.user.id];
  } else {
    query = `SELECT l.*, u1.name as aggregator_name, u2.name as industry_name 
             FROM lots l LEFT JOIN users u1 ON l.aggregator_id=u1.id LEFT JOIN users u2 ON l.industry_id=u2.id
             ORDER BY l.created_at DESC`;
    params = [];
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create lot from batches
router.post("/", (req, res) => {
  const { batch_ids, material } = req.body;
  if (!batch_ids || !batch_ids.length || !material)
    return res.status(400).json({ error: "batch_ids and material required" });

  const placeholders = batch_ids.map(() => "?").join(",");
  db.all(
    `SELECT * FROM batches WHERE id IN (${placeholders}) AND aggregator_id=? AND status='delivered'`,
    [...batch_ids, req.user.id],
    (err, batches) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!batches.length)
        return res.status(400).json({ error: "No valid batches found" });

      const total_weight = batches.reduce((s, b) => s + b.weight_kg, 0);
      const id = randomUUID();
      const ts = Date.now().toString().slice(-5);
      const lot_code = `LOT-${new Date().getFullYear()}-${ts}`;

      db.run(
        `INSERT INTO lots (id,lot_code,material,total_weight_kg,status,aggregator_id) VALUES (?,?,?,?,?,?)`,
        [id, lot_code, material, total_weight, "available", req.user.id],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          batches.forEach((b) => {
            db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, [
              id,
              b.id,
            ]);
          });
          logAudit(
            null,
            id,
            req.user.id,
            req.user.role,
            "LOT_CREATED",
            `Consolidated ${batches.length} batches`,
            total_weight,
          );

          // Auto-match check
          db.all(
            `SELECT * FROM demands WHERE material=? AND status='open' AND quantity_kg <= ?`,
            [material, total_weight],
            (e, demands) => {
              if (!e && demands.length) {
                const match_id = randomUUID();
                db.run(
                  `INSERT INTO matches (id,lot_id,demand_id,status) VALUES (?,?,?,?)`,
                  [match_id, id, demands[0].id, "pending"],
                );
                db.run(`UPDATE lots SET status='matched' WHERE id=?`, [id]);
                db.run(`UPDATE demands SET status='matched' WHERE id=?`, [
                  demands[0].id,
                ]);
              }
            },
          );

          db.get("SELECT * FROM lots WHERE id=?", [id], (e, row) =>
            res.json(row),
          );
        },
      );
    },
  );
});

// Accept lot (industry)
router.patch("/:id/accept", (req, res) => {
  const { demand_id } = req.body;
  db.run(
    `UPDATE lots SET status='accepted', industry_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [req.user.id, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (demand_id)
        db.run(`UPDATE demands SET status='matched' WHERE id=?`, [demand_id]);
      db.get("SELECT * FROM lots WHERE id=?", [req.params.id], (e, row) => {
        logAudit(
          null,
          req.params.id,
          req.user.id,
          req.user.role,
          "LOT_ACCEPTED",
          `Accepted by ${req.user.name}`,
          row?.total_weight_kg,
        );
        res.json(row);
      });
    },
  );
});

// Get lot audit trail
router.get("/:id/audit", (req, res) => {
  db.all(
    `SELECT al.*, u.name as actor_name FROM audit_log al LEFT JOIN users u ON al.actor_id=u.id 
     WHERE al.lot_id=? ORDER BY al.timestamp ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

module.exports = router;
