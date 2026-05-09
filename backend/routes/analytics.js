const express = require('express');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', (req, res) => {
  const result = {};

  db.get('SELECT COUNT(*) as total, SUM(weight_kg) as total_weight FROM batches', [], (err, r) => {
    result.batches = r;
    db.get('SELECT COUNT(*) as total, SUM(total_weight_kg) as total_weight FROM lots', [], (err2, r2) => {
      result.lots = r2;
      db.get('SELECT COUNT(*) as total FROM matches WHERE status="accepted"', [], (err3, r3) => {
        result.matches = r3;
        db.get('SELECT COUNT(*) as total FROM users WHERE role != "admin"', [], (err4, r4) => {
          result.users = r4;
          db.all(
            `SELECT material, SUM(weight_kg) as total_weight, COUNT(*) as count 
             FROM batches GROUP BY material ORDER BY total_weight DESC`,
            [], (err5, r5) => {
              result.by_material = r5;
              db.all(
                `SELECT status, COUNT(*) as count FROM batches GROUP BY status`,
                [], (err6, r6) => {
                  result.by_status = r6;
                  db.all(
                    `SELECT al.*, u.name as actor_name FROM audit_log al LEFT JOIN users u ON al.actor_id=u.id ORDER BY al.timestamp DESC LIMIT 20`,
                    [], (err7, r7) => {
                      result.recent_activity = r7;
                      res.json(result);
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  });
});

module.exports = router;
