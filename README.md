<img width="400" height="100" alt="Screenshot 2026-05-09 085916" src="https://github.com/user-attachments/assets/d0d97773-daa9-416a-857b-d3501af1f066" />


# ♻️ TraceChain — Traceable Waste Flow Network

> **GreenHack by Grevoro · Problem Statement 2**
> Transforming India's fragmented informal recycling chain into a traceable, data-driven waste network.

---

## 🧩 Problem

India's waste recycling ecosystem moves through 5 layers — households → ragpickers → kabadiwalas → recyclers — with **zero digital tracking**. No batch is documented, no supply-demand matching exists, and high-value recyclables are lost in an opaque chain.

## 💡 Solution

TraceChain digitizes the entire waste flow through a **role-based platform** where every actor (collector, aggregator, industry) logs, receives, and transfers waste batches. Each batch gets a **unique QR-backed ID**. Every handoff creates an **append-only audit log** — tamper-proof traceability without blockchain overhead. An **AI matching engine** auto-connects kabadiwala supply to industry demand.

---

## 🏗️ Architecture

```
Frontend (React + Tailwind)
    ↓ REST API (Axios)
Backend (Node.js + Express)
    ↓ SQLite (PostgreSQL-ready)
Database Schema:
  users → batches → lots → matches
                ↓
           audit_log (append-only)
```

### Tech Stack

| Layer    | Technology                                                 |
| -------- | ---------------------------------------------------------- |
| Frontend | React 18, React Router v6, Recharts, QRCode.react          |
| Backend  | Node.js, Express, JWT Auth                                 |
| Database | SQLite (production: PostgreSQL)                            |
| Auth     | JWT Role-Based (collector / aggregator / industry / admin) |
| Tracking | QR Batch IDs (`WN-{timestamp}-{rand4}`)                    |
| Charts   | Recharts (bar + pie)                                       |

---

## 👥 Roles & Features

### 🧺 Collector (Ragpicker)

- Phone OTP-style login
- Log waste batch: material type + weight → auto-generates QR Batch ID
- View batch history with status (collected → in-transit → delivered)
- Display QR code for kabadiwala scanning
- Mobile-first UI with large buttons

### 🏪 Kabadiwala (Aggregator)

- Scan / enter Batch QR Code to receive batches
- Consolidate multiple batches into a **Lot**
- View real-time inventory by material type
- See demand match alerts from industries
- Full audit trail per batch

### 🏭 Recycler (Industry)

- Post demand: material needed, quantity (kg), price offered (₹/kg)
- View available lots matching their demand
- Accept a lot → triggers chain confirmation
- View all accepted lots history

### 🛡️ Admin

- Full network map: all batches, all actors
- Material volume analytics (bar + pie charts)
- Complete append-only audit log
- Match history table

---

## 🔑 Core Logic

### Batch ID Format

```
WN-{7-digit-timestamp}-{4-char-random}
Example: WN-1700000-A1B2
```

### Audit Log (Append-Only)

```json
{
  "batchId": "uuid",
  "actorId": "u1",
  "actorRole": "collector",
  "action": "BATCH_CREATED",
  "details": "Batch created at Dharavi",
  "weight_kg": 45.5,
  "timestamp": "2024-01-01T10:00:00Z"
}
```

Actions: `BATCH_CREATED → BATCH_DISPATCHED → BATCH_RECEIVED → LOT_CREATED → LOT_ACCEPTED`

### AI Demand-Supply Matcher

When a kabadiwala's inventory of material X meets an industry's posted minimum threshold → **auto-creates a match** and alerts both parties.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/tracechain.git
cd tracechain

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running the App

**Terminal 1 — Backend:**

```bash
cd backend
node server.js
# Server runs on http://localhost:5000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

---

## 🔐 Demo Accounts

| Role                    | Phone      | Password |
| ----------------------- | ---------- | -------- |
| Collector (Ramu)        | 9000000001 | pass123  |
| Collector (Sita)        | 9000000002 | pass123  |
| Aggregator (Suresh)     | 9000000004 | pass123  |
| Industry (GreenRecycle) | 9000000006 | pass123  |
| Admin                   | 9000000000 | admin123 |

> Click any demo account chip on the login page to auto-fill credentials.

---

## 📊 Database Schema

```sql
users         — id, name, phone, password (bcrypt), role, location
batches       — id, batch_code, material, weight_kg, status, collector_id, aggregator_id
lots          — id, lot_code, material, total_weight_kg, status, aggregator_id, industry_id
lot_batches   — lot_id, batch_id (junction)
demands       — id, industry_id, material, quantity_kg, price_per_kg, status
audit_log     — id, batch_id, lot_id, actor_id, actor_role, action, details, weight_kg, timestamp
matches       — id, lot_id, demand_id, status
```

---

## 📁 Project Structure

```
tracechain/
├── backend/
│   ├── db/
│   │   └── database.js        # SQLite init + seed data
│   ├── middleware/
│   │   └── auth.js            # JWT middleware + role guard
│   ├── routes/
│   │   ├── auth.js            # Login, user management
│   │   ├── batches.js         # CRUD + QR scan + audit
│   │   ├── lots.js            # Consolidation + matching
│   │   ├── demands.js         # Industry demand posts
│   │   └── analytics.js      # Admin summary stats
│   ├── server.js              # Express app entry
│   └── .env                   # JWT secret, port
│
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.js  # JWT auth state
        ├── components/
        │   └── Layout.js       # Sidebar navigation
        ├── pages/
        │   ├── Login.js
        │   ├── CollectorDashboard.js
        │   ├── AggregatorDashboard.js
        │   ├── IndustryDashboard.js
        │   └── AdminDashboard.js
        ├── App.js              # Routing
        └── index.css           # Full design system
```

---

## 🎯 Evaluation Alignment

| Criterion                        | How TraceChain Addresses It                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Problem Understanding**        | Models all 5 chain actors; solves tracking, opacity, informal worker inclusion, supply-demand gap |
| **System Design & Core Logic**   | QR batch IDs + append-only audit log + AI matcher + role-based architecture                       |
| **Innovation with Practicality** | SMS fallback concept + printed QR = zero disruption to ragpicker workflows                        |

---

## 👨‍💻 Team
VisionX 

**GreenHack by Grevoro · Problem Statement 2: Building a Traceable Waste Flow Network**

---

_Built with ♻️ for a cleaner India_
