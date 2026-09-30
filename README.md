# Laxmi Pharma — Design Suite

Fetched from Stitch project **Laxmi Pharma** (`projects/1224735909581497217`).

---

## 🚀 Features & Architecture

- **Prescription Upload & OCR Scanner**: Drag-and-drop zone with simulated medicine recognition.
- **Chronic Care Refill Stepper**: Interactive pill-tracker (Morning, Noon, Night) and 1-click renewal alerts.
- **Medicine Store**: Real-time stock search and category filters with functional cart drawer.
- **Laxmi AI Healthbot**: Clinical triage assistant checking drug interactions and dosage timings.
- **Pharmacist Consult Desk**: Live queue estimation and instant callback booking.

---

## 🎨 Design System: "Clinical Botanics"

- **Primary Colors**: Deep Emerald Teal (`#005c55` / `#0f766e`)
- **Secondary Colors**: Herbal Sage (`#006c49` / `#6cf8bb` / `#10b981`)
- **Tertiary Colors**: Warm Amber (`#7d4200` / `#d97706` / `#ffdcc3`)
- **Typography**: Plus Jakarta Sans (Regular, Semi-bold, Bold)
- **Shape Language**: Soft capsule / pill buttons (`rounded-full`), gentle cards (`rounded-lg` / 16px)
- **Full Spec**: See [`DESIGN.md`](DESIGN.md) or [`design_tokens.json`](design_tokens.json)

---

## 🖼️ Brand Assets

- **Brand Logo**: [`assets/laxmi_pharma_logo.png`](assets/laxmi_pharma_logo.png)
- **Pharmacist Portrait**: [`assets/pharmacist_portrait.png`](assets/pharmacist_portrait.png)
- **AI Infinity Vector**: [`assets/ai_infinity_loop.svg`](assets/ai_infinity_loop.svg)

---

## 🖥️ Backend Server (Express + MongoDB + Resend)

The project includes a Node.js Express backend with MongoDB persistence and Resend email notifications.

### 1. Configure Environment
Check or update `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/laxmi_pharma
RESEND_API_KEY=your_resend_api_key_here
ADMIN_EMAIL=admin@mywebsite.com
SENDER_EMAIL=onboarding@resend.dev
```

### 2. Start the Server
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:5000` and automatically serve both the static store frontend and the API endpoints:
- `POST /api/checkout` — Processes customer orders, saves to database, and triggers admin email notifications.
- `GET /api/checkout/orders` — Lists all orders in the system.
- `GET /health` — Service and database connection health check.

