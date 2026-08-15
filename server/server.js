require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const { connectDB, disconnectDB } = require('./config/db');
const { createRedisClient, createPubSubPair } = require('./config/redis');
const QueueService = require('./services/QueueService');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Express Setup ───────────────────────────────────────
const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);

// ─── Socket.IO Setup with Redis Adapter ──────────────────
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Health Check Endpoint ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// ─── Boot Sequence ───────────────────────────────────────
async function boot() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect Redis clients
    const mainRedis = createRedisClient('main');
    const { pubClient, subClient } = createPubSubPair();

    // Wait for all Redis clients to be ready
    await Promise.all([
      new Promise((resolve) => mainRedis.once('ready', resolve)),
      new Promise((resolve) => pubClient.once('ready', resolve)),
      new Promise((resolve) => subClient.once('ready', resolve)),
    ]);

    // 3. Wire Redis adapter to Socket.IO
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter connected');

    // 4. Initialize QueueService with fault recovery
    const queueService = new QueueService(mainRedis);
    await queueService.recoverQueue();

    // 5. Register WebSocket handlers
    registerSocketHandlers(io, queueService);

    // 6. Start HTTP server
    server.listen(PORT, () => {
      console.log(`\n🚀 ClinicFlow server running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket ready for connections`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      io.close();
      mainRedis.disconnect();
      pubClient.disconnect();
      subClient.disconnect();
      await disconnectDB();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('💥 Boot failed:', error);
    process.exit(1);
  }
}

// ─── WebSocket Event Handlers ────────────────────────────
function registerSocketHandlers(io, queueService) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── Join Queue ──────────────────────────────────────
    socket.on('patient:join', async (data, callback) => {
      try {
        const patient = await queueService.addPatient(data);

        // Join a room for this ticket so we can target updates
        socket.join(`ticket:${patient.ticketId}`);

        // Acknowledge with patient data
        if (typeof callback === 'function') {
          callback({ success: true, patient });
        }

        // Broadcast updated queue to all clients
        const queue = await queueService.getQueue();
        io.emit('queue:updated', queue);
      } catch (error) {
        console.error('Error in patient:join:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Get Queue State ─────────────────────────────────
    socket.on('queue:get', async (data, callback) => {
      try {
        const queue = await queueService.getQueue();
        if (typeof callback === 'function') {
          callback({ success: true, queue });
        }
      } catch (error) {
        console.error('Error in queue:get:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Get Patient By Ticket ───────────────────────────
    socket.on('patient:get', async (data, callback) => {
      try {
        const patient = await queueService.getPatientByTicket(data.ticketId);
        socket.join(`ticket:${data.ticketId}`);
        if (typeof callback === 'function') {
          callback({ success: true, patient });
        }
      } catch (error) {
        console.error('Error in patient:get:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Call Next Patient ───────────────────────────────
    socket.on('queue:callNext', async (data, callback) => {
      try {
        const queueType = data?.queueType || 'standard';
        const result = await queueService.callNext(queueType);

        if (result.success) {
          // Notify the specific patient they've been called
          io.to(`ticket:${result.patient.ticketId}`).emit('patient:called', {
            patient: result.patient,
          });

          // Send SMS Notification
          const smsService = require('./services/SmsService');
          const message = `Hello ${result.patient.name}, it's your turn! Please proceed to the consultation room. - ClinicFlow`;
          smsService.sendNotification(result.patient.phone, message);
        }

        if (typeof callback === 'function') {
          callback(result);
        }

        // Broadcast updated queue to all
        const queue = await queueService.getQueue();
        io.emit('queue:updated', queue);
      } catch (error) {
        console.error('Error in queue:callNext:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Complete Patient ────────────────────────────────
    socket.on('patient:complete', async (data, callback) => {
      try {
        const result = await queueService.completePatient(data.ticketId);

        if (result.success) {
          io.to(`ticket:${result.patient.ticketId}`).emit('patient:completed', {
            patient: result.patient,
          });
        }

        if (typeof callback === 'function') {
          callback(result);
        }

        const queue = await queueService.getQueue();
        io.emit('queue:updated', queue);
      } catch (error) {
        console.error('Error in patient:complete:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Remove Patient ──────────────────────────────────
    socket.on('patient:remove', async (data, callback) => {
      try {
        const result = await queueService.removePatient(data.ticketId);

        if (result.success) {
          io.to(`ticket:${result.patient.ticketId}`).emit('patient:removed', {
            patient: result.patient,
          });
        }

        if (typeof callback === 'function') {
          callback(result);
        }

        const queue = await queueService.getQueue();
        io.emit('queue:updated', queue);
      } catch (error) {
        console.error('Error in patient:remove:', error.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    // ── Patient Review ───────────────────────────────────
    socket.on('patient:review', async (data, callback) => {
      try {
        const { ticketId, rating, comment, name, queueType } = data;
        const Review = require('./models/Review');

        await Review.create({
          ticketId,
          patientName: name || 'Anonymous',
          rating,
          comment: comment || '',
          queueType: queueType || 'standard',
        });

        console.log(`⭐ Review saved — ${name || 'Anonymous'}: ${rating}/5 "${comment || ''}"`);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        console.error('Error saving review:', error.message);
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // ── Get Reviews (for dashboard) ──────────────────────
    socket.on('reviews:get', async (data, callback) => {
      try {
        const Review = require('./models/Review');
        const reviews = await Review.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .exec();
        const avgRating = reviews.length
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : null;
        if (typeof callback === 'function') {
          callback({ success: true, reviews: reviews.map(r => r.toJSON()), avgRating });
        }
      } catch (error) {
        console.error('Error fetching reviews:', error.message);
        if (typeof callback === 'function') callback({ success: false, reviews: [] });
      }
    });

    // ── Disconnect ──────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });
}

// ─── Start ───────────────────────────────────────────────
boot();
