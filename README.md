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

## 🛠️ Technology Stack
- **Frontend:** React.js, Vite, Custom Vanilla CSS (Glassmorphism & Micro-animations)
- **Backend:** Node.js, Express.js
- **Database & Caching:** MongoDB, Redis
- **Real-Time Engine:** Socket.io
- **Third-Party APIs:** Twilio SMS

## 🚀 How to Run Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [Docker](https://www.docker.com/) (or local instances of MongoDB & Redis) installed.

### 1. Setup the Backend
Open a terminal and run the following commands:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and add your configurations (comment out Twilio keys to use the local Mock SMS Service):
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27018/clinicflow
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173

# TWILIO_ACCOUNT_SID=your_sid
# TWILIO_AUTH_TOKEN=your_token
# TWILIO_PHONE_NUMBER=your_number
```
Start the backend server:
```bash
npm start
```

### 2. Setup the Frontend
Open a **second** terminal and run:
```bash
cd client
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser to view the application!

## 📸 Usage Guide
1. Select **Patient** to join the queue and enter your details.
2. Select **Admin** to view the live dashboard. Click **Call** to simulate sending an SMS to the patient, and click **Complete** to process them out of the queue.

---
*Built by Saransh*
