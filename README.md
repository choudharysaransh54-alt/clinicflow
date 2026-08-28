# 🏥 ClinicFlow - Advanced Healthcare Orchestration System

![ClinicFlow Banner](https://img.shields.io/badge/Status-Complete-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Groq_Llama_3-purple?style=for-the-badge)

ClinicFlow is a comprehensive, modern hospital queue management and EHR (Electronic Health Record) system designed to streamline patient intake, diagnosis, and pharmacy workflows. Built with a stunning dynamic UI and a highly secure backend, it leverages real-time bidirectional synchronization, advanced state machines, and AI integrations to completely automate healthcare orchestration.

## ✨ Key Features

- **Real-Time Synchronization:** Powered by WebSockets (Socket.io) with Redis Pub/Sub to instantly update patient queues and status changes across all staff dashboards without page refreshes.
- **AI-Powered Diagnostics:** Integrated Groq (Llama 3/Qwen) AI engine to automatically recommend the best specialized doctor based on patient symptoms.
- **Comprehensive Role-Based Access Control (RBAC):** Secure, isolated workflows for Administrators, Doctors, and Patients with strict JWT-based authentication and rate limiting.
- **Advanced State Machine:** Robust patient journey tracking—from `waiting_general` to `waiting_doctor`, `in_consultation`, `waiting_pharmacy`, and `completed`.
- **EHR & Medical Records:** Full medical history tracking including allergies, chronic conditions, and previous visit notes.
- **Enterprise Messaging:** Integrated Twilio SMS API with a custom mock-service fallback architecture for development environments to alert patients when it is their turn.
- **Shift & Staff Management:** Built-in tools for Admins to manage staff accounts, shifts, and hospital rosters.

## 🏗️ Project Structure

```text
clinicflow/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # UI Components (Navbar, IntakeForm, QueueStatus)
│   │   ├── context/        # React Context (AuthContext)
│   │   ├── pages/          # Application Pages (DoctorDashboard, ClinicDashboard, PatientView)
│   │   ├── hooks/          # Custom React hooks (useSocket)
│   │   ├── App.jsx         # Main React Component & Routing
│   │   └── styles/         # Custom Glassmorphism Styles
│   ├── package.json
│   └── vite.config.js      # Vite Configuration
│
└── server/                 # Backend Node.js Application
    ├── config/             # DB, Redis & Logger configurations
    ├── middleware/         # Security (Auth, Rate Limiting, Helmet) & Error Handling
    ├── models/             # Mongoose Schemas (Patient, Staff, MedicalRecord, Shift)
    ├── routes/             # Express API Routes (Auth, Queue, Records, AI, Shifts)
    ├── services/           # Business Logic (AIService, StateService, RedisQueueService)
    ├── server.js           # Express App & Socket.io Entry Point
    └── package.json
```

## 🧠 Architecture Details

### Frontend (Client)
- **Framework:** React.js powered by Vite for lightning-fast HMR and optimized builds.
- **State Management:** Custom React hooks and Context API manage global authentication, local state, and real-time socket connections.
- **Real-Time UI:** `socket.io-client` listens for server events to update the queue and patient status instantly across all connected clients.
- **Styling:** Vanilla CSS focusing on a premium, responsive Glassmorphism aesthetic without heavy CSS frameworks, ensuring maximum flexibility.

### Backend (Server)
- **Core Server:** Node.js with Express.js handling RESTful API requests, static routing, and robust error handling.
- **Security:** Hardened with `helmet` for HTTP headers, `express-rate-limit` against brute-force attacks, and `express-validator` for strict input sanitization.
- **Real-Time Engine:** Socket.io handles bidirectional communication. It broadcasts events like `patient_added`, `state_change`, and `patient_completed` to all connected clients.
- **Database:** MongoDB Atlas is used for persistent storage of patient records, staff directories, and EHR data, ensuring data integrity.
- **In-Memory Cache / PubSub:** Upstash Redis is integrated with Socket.io using the Redis Adapter. This ensures that WebSocket events are seamlessly broadcasted across all servers if horizontally scaled.
- **AI Microservice:** A custom `AIService.js` integrates with the Groq API for rapid LLM inference, analyzing patient symptoms to route them to the correct specialty.

## 🚀 Live Deployment Architecture

This project is configured for cloud-native deployment:
1. **Frontend:** Hosted on [Vercel](https://vercel.com/) for global CDN distribution.
2. **Backend:** Hosted on [Render](https://render.com/) running a Node.js web service.
3. **Databases:** Hosted on MongoDB Atlas and Upstash Redis.

### Local Development Setup

Open a terminal and run the backend:
```bash
cd server
npm install
npm run dev
```

Open a **second** terminal and run the frontend:
```bash
cd client
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## 📸 Usage Guide
1. **Patient Portal:** Select **Patient** to join the queue and enter your symptoms. The AI will automatically route you to the correct department.
2. **Admin Dashboard:** Log in as an Admin to view the live dashboard, manage the staff directory, create shifts, and oversee the entire clinic's queue.
3. **Doctor Dashboard:** Log in as a Doctor to view your specific patient queue, review medical records, and write consultation notes/prescriptions. 
4. **Pharmacy Queue:** Patients assigned medications automatically appear here for dispensation.
