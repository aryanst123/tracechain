const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../tracechain.db");

const db = new sqlite3.Database(DB_PATH);

function initDB() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('collector','aggregator','industry','admin')),
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Batches table
    db.run(`CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      material TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'collected',
      collector_id TEXT NOT NULL,
      aggregator_id TEXT,
      industry_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(collector_id) REFERENCES users(id),
      FOREIGN KEY(aggregator_id) REFERENCES users(id),
      FOREIGN KEY(industry_id) REFERENCES users(id)
    )`);

    // Lots table (aggregated batches)
    db.run(`CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY,
      lot_code TEXT UNIQUE NOT NULL,
      material TEXT NOT NULL,
      total_weight_kg REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      aggregator_id TEXT NOT NULL,
      industry_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(aggregator_id) REFERENCES users(id),
      FOREIGN KEY(industry_id) REFERENCES users(id)
    )`);

    // Lot-batch mapping
    db.run(`CREATE TABLE IF NOT EXISTS lot_batches (
      lot_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      PRIMARY KEY(lot_id, batch_id),
      FOREIGN KEY(lot_id) REFERENCES lots(id),
      FOREIGN KEY(batch_id) REFERENCES batches(id)
    )`);

    // Demand posts by industries
    db.run(`CREATE TABLE IF NOT EXISTS demands (
      id TEXT PRIMARY KEY,
      industry_id TEXT NOT NULL,
      material TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(industry_id) REFERENCES users(id)
    )`);

    // Audit log (append-only)
    db.run(`CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      lot_id TEXT,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      weight_kg REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Matches table
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      lot_id TEXT NOT NULL,
      demand_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lot_id) REFERENCES lots(id),
      FOREIGN KEY(demand_id) REFERENCES demands(id)
    )`);

    // Seed data
    seedData();
  });
}

function seedData() {
  const users = [
    {
      id: "u1",
      name: "Ramu Kumar",
      phone: "9000000001",
      password: "pass123",
      role: "collector",
      location: "Dharavi, Mumbai",
    },
    {
      id: "u2",
      name: "Sita Devi",
      phone: "9000000002",
      password: "pass123",
      role: "collector",
      location: "Kurla, Mumbai",
    },
    {
      id: "u3",
      name: "Mohan Singh",
      phone: "9000000003",
      password: "pass123",
      role: "collector",
      location: "Andheri, Mumbai",
    },
    {
      id: "u4",
      name: "Kabadiwala Suresh",
      phone: "9000000004",
      password: "pass123",
      role: "aggregator",
      location: "Dharavi Hub",
    },
    {
      id: "u5",
      name: "Kabadiwala Priya",
      phone: "9000000005",
      password: "pass123",
      role: "aggregator",
      location: "Kurla Hub",
    },
    {
      id: "u6",
      name: "GreenRecycle Ltd",
      phone: "9000000006",
      password: "pass123",
      role: "industry",
      location: "Thane Industrial",
    },
    {
      id: "u7",
      name: "EcoMelt Industries",
      phone: "9000000007",
      password: "pass123",
      role: "industry",
      location: "Navi Mumbai",
    },
    {
      id: "admin1",
      name: "Admin",
      phone: "9000000000",
      password: "admin123",
      role: "admin",
      location: "HQ",
    },
  ];

  users.forEach((u) => {
    const hash = bcrypt.hashSync(u.password, 8);
    db.run(
      `INSERT OR IGNORE INTO users (id,name,phone,password,role,location) VALUES (?,?,?,?,?,?)`,
      [u.id, u.name, u.phone, hash, u.role, u.location],
    );
  });

  const materials = ["plastic", "metal", "paper", "glass", "e-waste"];
  const statuses = [
    "collected",
    "in-transit",
    "delivered",
    "delivered",
    "delivered",
  ];

  const batches = [
    {
      id: "b1",
      code: "WN-1700000001-A1B2",
      material: "plastic",
      weight: 45.5,
      status: "delivered",
      collector: "u1",
      aggregator: "u4",
    },
    {
      id: "b2",
      code: "WN-1700000002-C3D4",
      material: "metal",
      weight: 32.0,
      status: "delivered",
      collector: "u2",
      aggregator: "u4",
    },
    {
      id: "b3",
      code: "WN-1700000003-E5F6",
      material: "paper",
      weight: 67.2,
      status: "in-transit",
      collector: "u3",
      aggregator: null,
    },
    {
      id: "b4",
      code: "WN-1700000004-G7H8",
      material: "glass",
      weight: 28.8,
      status: "collected",
      collector: "u1",
      aggregator: null,
    },
    {
      id: "b5",
      code: "WN-1700000005-I9J0",
      material: "e-waste",
      weight: 15.0,
      status: "delivered",
      collector: "u2",
      aggregator: "u5",
    },
    {
      id: "b6",
      code: "WN-1700000006-K1L2",
      material: "plastic",
      weight: 55.0,
      status: "delivered",
      collector: "u3",
      aggregator: "u5",
    },
    {
      id: "b7",
      code: "WN-1700000007-M3N4",
      material: "metal",
      weight: 40.0,
      status: "collected",
      collector: "u1",
      aggregator: null,
    },
    {
      id: "b8",
      code: "WN-1700000008-O5P6",
      material: "paper",
      weight: 80.0,
      status: "in-transit",
      collector: "u2",
      aggregator: null,
    },
    {
      id: "b9",
      code: "WN-1700000009-Q7R8",
      material: "plastic",
      weight: 60.0,
      status: "delivered",
      collector: "u3",
      aggregator: "u4",
    },
    {
      id: "b10",
      code: "WN-1700000010-S9T0",
      material: "glass",
      weight: 22.5,
      status: "collected",
      collector: "u1",
      aggregator: null,
    },
  ];

  batches.forEach((b) => {
    db.run(
      `INSERT OR IGNORE INTO batches (id,batch_code,material,weight_kg,status,collector_id,aggregator_id) VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.code, b.material, b.weight, b.status, b.collector, b.aggregator],
    );
  });

  // Lots
  db.run(
    `INSERT OR IGNORE INTO lots (id,lot_code,material,total_weight_kg,status,aggregator_id,industry_id) VALUES (?,?,?,?,?,?,?)`,
    ["l1", "LOT-2024-001", "plastic", 160.5, "matched", "u4", "u6"],
  );
  db.run(
    `INSERT OR IGNORE INTO lots (id,lot_code,material,total_weight_kg,status,aggregator_id) VALUES (?,?,?,?,?,?)`,
    ["l2", "LOT-2024-002", "metal", 72.0, "available", "u4"],
  );
  db.run(
    `INSERT OR IGNORE INTO lots (id,lot_code,material,total_weight_kg,status,aggregator_id) VALUES (?,?,?,?,?,?)`,
    ["l3", "LOT-2024-003", "e-waste", 15.0, "available", "u5"],
  );

  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l1", "b1"]);
  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l1", "b6"]);
  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l1", "b9"]);
  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l2", "b2"]);
  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l2", "b7"]);
  db.run(`INSERT OR IGNORE INTO lot_batches VALUES (?,?)`, ["l3", "b5"]);

  // Demands
  db.run(
    `INSERT OR IGNORE INTO demands (id,industry_id,material,quantity_kg,price_per_kg,status) VALUES (?,?,?,?,?,?)`,
    ["d1", "u6", "plastic", 100, 12.5, "matched"],
  );
  db.run(
    `INSERT OR IGNORE INTO demands (id,industry_id,material,quantity_kg,price_per_kg,status) VALUES (?,?,?,?,?,?)`,
    ["d2", "u7", "metal", 50, 35.0, "open"],
  );
  db.run(
    `INSERT OR IGNORE INTO demands (id,industry_id,material,quantity_kg,price_per_kg,status) VALUES (?,?,?,?,?,?)`,
    ["d3", "u6", "paper", 200, 8.0, "open"],
  );

  // Audit logs
  const logs = [
    {
      id: "al1",
      batch_id: "b1",
      actor: "u1",
      role: "collector",
      action: "BATCH_CREATED",
      details: "Batch logged at Dharavi",
      weight: 45.5,
    },
    {
      id: "al2",
      batch_id: "b1",
      actor: "u4",
      role: "aggregator",
      action: "BATCH_RECEIVED",
      details: "Received at Dharavi Hub",
      weight: 45.5,
    },
    {
      id: "al3",
      batch_id: "b2",
      actor: "u2",
      role: "collector",
      action: "BATCH_CREATED",
      details: "Batch logged at Kurla",
      weight: 32.0,
    },
    {
      id: "al4",
      batch_id: "b2",
      actor: "u4",
      role: "aggregator",
      action: "BATCH_RECEIVED",
      details: "Received at Dharavi Hub",
      weight: 32.0,
    },
    {
      id: "al5",
      lot_id: "l1",
      actor: "u4",
      role: "aggregator",
      action: "LOT_CREATED",
      details: "Consolidated plastic lot",
      weight: 160.5,
    },
    {
      id: "al6",
      lot_id: "l1",
      actor: "u6",
      role: "industry",
      action: "LOT_ACCEPTED",
      details: "Accepted by GreenRecycle",
      weight: 160.5,
    },
  ];

  logs.forEach((l) => {
    db.run(
      `INSERT OR IGNORE INTO audit_log (id,batch_id,lot_id,actor_id,actor_role,action,details,weight_kg) VALUES (?,?,?,?,?,?,?,?)`,
      [
        l.id,
        l.batch_id || null,
        l.lot_id || null,
        l.actor,
        l.role,
        l.action,
        l.details,
        l.weight,
      ],
    );
  });

  // Matches
  db.run(
    `INSERT OR IGNORE INTO matches (id,lot_id,demand_id,status) VALUES (?,?,?,?)`,
    ["m1", "l1", "d1", "accepted"],
  );
}

module.exports = { db, initDB };
