const express = require("express");
const { randomUUID } = require("crypto");
const { db } = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

function generateBatchCode() {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WN-${ts}-${rand}`;
}

function logAudit(batchId, lotId, actorId, actorRole, action, details, weight) {
  db.run(
    `INSERT INTO audit_log (id,batch_id,lot_id,actor_id,actor_role,action,details,weight_kg) VALUES (?,?,?,?,?,?,?,?)`,
    [randomUUID(), batchId, lotId, actorId, actorRole, action, details, weight],
  );
}

// Get all batches (filtered by role)
router.get("/", (req, res) => {
  let query, params;
  if (req.user.role === "collector") {
    query = `SELECT b.*, u1.name as collector_name, u2.name as aggregator_name 
             FROM batches b 
             LEFT JOIN users u1 ON b.collector_id=u1.id 
             LEFT JOIN users u2 ON b.aggregator_id=u2.id
             WHERE b.collector_id=? ORDER BY b.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === "aggregator") {
    query = `SELECT b.*, u1.name as collector_name, u2.name as aggregator_name 
             FROM batches b 
             LEFT JOIN users u1 ON b.collector_id=u1.id 
             LEFT JOIN users u2 ON b.aggregator_id=u2.id
             WHERE b.aggregator_id=? OR (b.status='in-transit' AND b.aggregator_id IS NULL)
             ORDER BY b.created_at DESC`;
    params = [req.user.id];
  } else {
    query = `SELECT b.*, u1.name as collector_name, u2.name as aggregator_name 
             FROM batches b 
             LEFT JOIN users u1 ON b.collector_id=u1.id 
             LEFT JOIN users u2 ON b.aggregator_id=u2.id
             ORDER BY b.created_at DESC`;
    params = [];
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create batch (collector)
router.post("/", (req, res) => {
  const { material, weight_kg, notes } = req.body;
  if (!material || !weight_kg)
    return res.status(400).json({ error: "Material and weight required" });

  const id = randomUUID();
  const batch_code = generateBatchCode();

  db.run(
    `INSERT INTO batches (id,batch_code,material,weight_kg,status,collector_id,notes) VALUES (?,?,?,?,?,?,?)`,
    [
      id,
      batch_code,
      material,
      weight_kg,
      "collected",
      req.user.id,
      notes || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAudit(
        id,
        null,
        req.user.id,
        req.user.role,
        "BATCH_CREATED",
        `Batch created at ${req.user.location}`,
        weight_kg,
      );
      db.get("SELECT * FROM batches WHERE id=?", [id], (e, row) =>
        res.json(row),
      );
    },
  );
});

// Get batch by code (scan QR)
router.get("/scan/:code", (req, res) => {
  db.get(
    `SELECT b.*, u1.name as collector_name, u2.name as aggregator_name 
     FROM batches b 
     LEFT JOIN users u1 ON b.collector_id=u1.id 
     LEFT JOIN users u2 ON b.aggregator_id=u2.id
     WHERE b.batch_code=?`,
    [req.params.code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Batch not found" });
      res.json(row);
    },
  );
});

// Receive batch (aggregator)
router.patch("/:id/receive", (req, res) => {
  const { id } = req.params;
  db.run(
    `UPDATE batches SET status='delivered', aggregator_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [req.user.id, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM batches WHERE id=?", [id], (e, row) => {
        logAudit(
          id,
          null,
          req.user.id,
          req.user.role,
          "BATCH_RECEIVED",
          `Received at ${req.user.location}`,
          row?.weight_kg,
        );
        res.json(row);
      });
    },
  );
});

// Mark in-transit
router.patch("/:id/transit", (req, res) => {
  db.run(
    `UPDATE batches SET status='in-transit', updated_at=CURRENT_TIMESTAMP WHERE id=? AND collector_id=?`,
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM batches WHERE id=?", [req.params.id], (e, row) => {
        logAudit(
          req.params.id,
          null,
          req.user.id,
          req.user.role,
          "BATCH_DISPATCHED",
          "Marked in-transit",
          row?.weight_kg,
        );
        res.json(row);
      });
    },
  );
});

// Audit trail for a batch
router.get("/:id/audit", (req, res) => {
  db.all(
    `SELECT al.*, u.name as actor_name FROM audit_log al LEFT JOIN users u ON al.actor_id=u.id 
     WHERE al.batch_id=? ORDER BY al.timestamp ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

module.exports = router;
