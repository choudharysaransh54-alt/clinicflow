# 🏥 ClinicFlow - Real-Time Patient Queue System

![ClinicFlow Banner](https://img.shields.io/badge/Status-Complete-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge)

ClinicFlow is a modern, real-time hospital queue management system designed to streamline the patient check-in and waiting process. It features a stunning glassmorphism UI, real-time bidirectional synchronization, and integrated SMS notifications to alert patients when it is their turn.

## ✨ Key Features
- **Real-Time Synchronization:** Powered by WebSockets (Socket.io) to instantly update patient queues across all screens without page refreshes.
- **Enterprise Messaging:** Integrated Twilio SMS API with a custom mock-service fallback architecture for development environments.
- **Role-Based Access Control:** Secure, isolated workflows for Clinic Administrators and Patients.
- **High-Performance Queuing:** Utilizes Redis as an in-memory message broker to handle real-time queue states efficiently.
- **Automated Feedback System:** Automatically redirects patients to a feedback portal upon completion of their visit.

## 🏗️ Project Structure
```text
clinicflow/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # UI Components (AdminPanel, IntakeForm, QueueStatus)
│   │   ├── hooks/          # Custom React hooks (useSocket)
│   │   ├── App.jsx         # Main React Component
│   │   └── index.css       # Custom Glassmorphism Styles
│   ├── package.json
│   └── vite.config.js      # Vite Configuration
│
└── server/                 # Backend Node.js Application
    ├── config/             # DB & Redis configurations
    ├── models/             # Mongoose Schemas (Patient)
    ├── routes/             # Express API Routes
    ├── services/           # Business Logic (SmsService)
    ├── server.js           # Express App & Socket.io Entry Point
    └── package.json
```

## 🧠 Architecture Details

### Frontend (Client)
- **Framework:** React.js powered by Vite for lightning-fast HMR and optimized builds.
- **State Management:** Custom React hooks manage local state and real-time socket connections.
- **Real-Time UI:** `socket.io-client` listens for server events to update the queue instantly across all connected clients.
- **Styling:** Vanilla CSS focusing on a modern, responsive Glassmorphism aesthetic without heavy CSS frameworks.

### Backend (Server)
- **Core Server:** Node.js with Express.js handling RESTful API requests (if needed) and static routing.
- **Real-Time Engine:** Socket.io handles bidirectional communication. It broadcasts events like `patient_added`, `patient_called`, and `patient_completed` to all connected clients.
- **Database:** MongoDB Atlas is used for persistent storage of patient records, ensuring data integrity even if the server restarts.
- **In-Memory Cache / PubSub:** Upstash Redis is integrated with Socket.io using the Redis Adapter. This ensures that if the backend scales horizontally to multiple instances, WebSocket events are seamlessly broadcasted across all servers.
- **SMS Microservice:** A custom `SmsService.js` integrates with Twilio's API to send SMS notifications to patients when they are called. (Currently defaults to a mock-logger for development to bypass telecom DLT restrictions).

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
npm start
```

Open a **second** terminal and run the frontend:
```bash
cd client
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## 📸 Usage Guide
1. Select **Patient** to join the queue and enter your details.
2. Select **Admin** to view the live dashboard. Click **Call** to simulate sending an SMS to the patient, and click **Complete** to process them out of the queue.

---
*Built by Saransh Chaudhary*
