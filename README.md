# Laxmi Pharma 🌿💊

> **A full-featured digital pharmacy and clinical care platform built for neighbourhood apothecaries. Laxmi Pharma allows patients to browse genuine medicines, manage chronic refill schedules, consult certified pharmacists, upload prescriptions, and chat with an AI-powered health assistant.**

[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Platform-Firebase-FFA611?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Supabase](https://img.shields.io/badge/Auth%20%26%20DB-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

---

## 🚀 Key Features

* **🛒 Medicine Store & Cart:** Real-time stock search, category filters, and an interactive slide-out cart.
* **🔁 Chronic Care Refill Stepper:** Patient adherence tracker for Morning, Noon, and Night schedules with renewal alerts.
* **👨‍⚕️ Pharmacist Consult Desk:** Instant appointment booking and triage desk supervised by accredited pharmacists.
* **📄 Prescription Upload & OCR Scanner:** Drag-and-drop prescription submission for rapid pharmacist verification.
* **🤖 AI Health Assistant:** Clinical conversational assistant answering medication timings, drug interactions, and dietary guidance.
* **🔐 Supabase Authentication:** Passwordless Email OTP authentication for customer accounts.

---

## 🎨 Design System: "Clinical Botanics"

* **Primary Palette:** Deep Emerald Teal (`#005c55` / `#0f766e`) & Sage Green (`#10b981`)
* **Warm Accents:** Amber & Gold (`#d97706` / `#ffdcc3`)
* **Typography:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & Google Material Symbols
* **Shape Language:** Smooth pill-shaped micro-interactions, clean glass cards, and responsive fluid layout.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
* **Backend:** Node.js, Express.js
* **Authentication & Database:** Supabase (Auth & Postgres)
* **Email Service:** Resend SMTP / API
* **Hosting:** Firebase Hosting

---

## 💻 Local Setup & Development

### 1. Clone the repository:
```bash
git clone https://github.com/sandip07102004/laxmi-pharma.git
cd laxmi-pharma
```

### 2. Environment Variables:
Copy the example environment configuration:
```bash
cp .env.example .env
```
Fill in your own Supabase credentials and Resend API keys.

### 3. Run the Backend Server:
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:5000`.

### 4. Deploy to Firebase:
```bash
npx firebase-tools deploy --only hosting
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
