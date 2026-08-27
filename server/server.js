require('./config/validateEnv');
const logger = require('./config/logger');
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { startReassignmentJob } = require('./jobs/reassignmentJob');

const { connectDB, disconnectDB } = require('./config/db');
const { createRedisClient, createPubSubPair } = require('./config/redis');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Express Setup ───────────────────────────────────────
const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ─── Mount REST API Routes ───────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/analytics', require('./middleware/auth').authenticate, require('./routes/analytics'));
app.use('/api/staff', require('./middleware/auth').authenticate, require('./routes/staff'));
app.use('/api/shifts', require('./middleware/auth').authenticate, require('./routes/shifts'));
app.use('/api/records', require('./middleware/auth').authenticate, require('./routes/records'));
app.use('/api/ai', require('./routes/ai'));

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

// Provide io to express routes
app.set('io', io);

// ─── Health Check Endpoint ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// ─── Error Handler (Last Middleware) ─────────────────────
app.use(require('./middleware/errorHandler'));

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
    logger.info('✅ Socket.IO Redis adapter connected');

    // 4. Register WebSocket handlers
    registerSocketHandlers(io);

    // 5. Start background jobs
    startReassignmentJob(io);

    // 6. Start HTTP server
    server.listen(PORT, () => {
      logger.info(`\n🚀 ClinicFlow server running on http://localhost:${PORT}`);
      logger.info(`📡 WebSocket ready for connections`);
      logger.info(`🩺 Health check: http://localhost:${PORT}/api/health\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);
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
    logger.error('💥 Boot failed:', error);
    process.exit(1);
  }
}

// ─── WebSocket Event Handlers ────────────────────────────
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    // Namespaced room joining
    socket.on('join:admin', () => {
      socket.join('admin');
      logger.info(`Socket ${socket.id} joined admin room`);
    });
    
    socket.on('join:doctor', (doctorId) => {
      socket.join(`doctor:${doctorId}`);
      logger.info(`Socket ${socket.id} joined doctor:${doctorId} room`);
    });
    
    socket.on('join:patient', (patientId) => {
      socket.join(`patient:${patientId}`);
      logger.info(`Socket ${socket.id} joined patient:${patientId} room`);
    });
    
    socket.on('join:pharmacy', () => {
      socket.join('pharmacy');
      logger.info(`Socket ${socket.id} joined pharmacy room`);
    });

    // Keep patient review logic as it wasn't replaced by REST
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

        logger.info(`⭐ Review saved — ${name || 'Anonymous'}: ${rating}/5 "${comment || ''}"`);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        logger.error('Error saving review:', error.message);
        if (typeof callback === 'function') callback({ success: false });
      }
    });

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
        logger.error('Error fetching reviews:', error.message);
        if (typeof callback === 'function') callback({ success: false, reviews: [] });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });
}

// ─── Start ───────────────────────────────────────────────
boot();
