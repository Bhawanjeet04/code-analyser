// Backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { WebSocketServer } from 'ws';
import { initYjsSocket } from './socket/yjsSocket.js';

import roomRoutes from './routes/roomRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/code_analyzer';

// 1. Global Middleware Pipelines
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// 2. Database Layer Connectivity with Automated Index Fixer
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('📁 MongoDB Connection established successfully.');

    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: 'codes' }).toArray();

      if (collections.length > 0) {
        const indexInformation = await db.collection('codes').indexInformation();
        if (indexInformation.userId_1_roomId_1) {
          await db.collection('codes').dropIndex('userId_1_roomId_1');
          console.log('✨ Old unique index (userId_1_roomId_1) dropped successfully via backend startup hook.');
        }
      }
    } catch (indexErr) {
      console.log('ℹ️ Index cleanup skipped or already synchronized.');
    }
  })
  .catch((err) => console.error('❌ Database connectivity error:', err.message));

// 3. MVC Express Route Configurations
app.use('/api/code', codeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
// 4. API Gateway Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Server Operational',
    architecture: 'MVC Decoupled Layout with Yjs CRDT Sync'
  });
});

// 5. Global Error Handling Middleware fallback
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected internal routing server error occurred.' });
});

// 6. Create native HTTP Server wrapping your Express instance
const server = http.createServer(app);

// 7. Attach the Yjs-based sync WebSocket server onto the same HTTP listener.
//    All real-time sync (personal file editing AND live-share sessions) goes
//    through this single handler now — the old raw broadcast relay is gone.
const wss = new WebSocketServer({ noServer: true });
initYjsSocket(wss);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// 8. Listener Initialization
server.listen(PORT, () => {
  console.log(`🚀 Unified Node Server + Yjs Sync running on http://localhost:${PORT}`);
});