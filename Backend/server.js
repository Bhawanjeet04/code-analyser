// Backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { WebSocketServer } from 'ws';
import { Code } from './models/Code.js'; // 🚀 IMPORTED: To handle automated multi-client state hydration

// Import MVC Route Handlers
import codeRoutes from './routes/codeRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Configure environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/code_analyzer';

// 1. Global Middleware Pipelines
app.use(cors({
  origin: 'http://localhost:5173', // Vite frontend default port
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

// 4. API Gateway Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'Server Operational', 
    architecture: 'MVC Decoupled Layout with WebSocket Cluster' 
  });
});

// 5. Global Error Handling Middleware fallback
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected internal routing server error occurred.' });
});

// 6. Create native HTTP Server wrapping your Express instance
const server = http.createServer(app);

// 7. Attach Real-Time WebSocket Server Cluster directly onto the core HTTP listener channel
const wss = new WebSocketServer({ noServer: true });
const rooms = new Map();

wss.on('connection', async (ws, req) => {
  const cleanUrl = req.url.split('?')[0]; 
  const urlParts = cleanUrl.split('/').filter(Boolean); 
  
  // Reconstruct an absolute distinct composite match identifier channel (e.g. room-123-main.cpp)
  const roomKey = urlParts.join('-'); 

  if (!roomKey) {
    ws.close();
    return;
  }

  if (!rooms.has(roomKey)) {
    rooms.set(roomKey, new Set());
  }
  const clientRoom = rooms.get(roomKey);
  clientRoom.add(ws);

  console.log(`📡 Peer joined sync session channel: [${roomKey}]. Connected clients: ${clientRoom.size}`);

  // 🚀 FIXED: If a new peer connects to an existing room, try to instantly fetch 
  // the database snapshot to prevent blank overrides
  if (clientRoom.size > 1) {
    try {
      // Parse information out from the constructed unified room key string
      // Format: "room-[id]-[filename.ext]"
      const keySegments = roomKey.split('-');
      if (keySegments.length >= 3) {
        const parsedRoomId = `${keySegments[0]}-${keySegments[1]}`;
        const parsedFileName = keySegments.slice(2).join('-');

        const savedDocSnapshot = await Code.findOne({ roomId: parsedRoomId, fileName: parsedFileName });
        if (savedDocSnapshot && savedDocSnapshot.codeContent) {
          // Send a safe internal system sync frame containing initial truth text parameters
          ws.send(JSON.stringify({
            type: 'SYSTEM_INITIAL_HYDRATION',
            codeContent: savedDocSnapshot.codeContent,
            language: savedDocSnapshot.language
          }));
        }
      }
    } catch (err) {
      console.error("Failed to execute WebSocket internal backfill hydration:", err);
    }
  }

  // Broadcast operational tracking buffers 
  ws.on('message', (message) => {
    try {
      // Pass raw text stream buffers through smoothly
      clientRoom.forEach((client) => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message);
        }
      });
    } catch (broadcastErr) {
      console.error("Socket forward error:", broadcastErr);
    }
  });

  ws.on('close', () => {
    clientRoom.delete(ws);
    console.log(`🔌 Peer left sync session channel: [${roomKey}]. Remaining clients: ${clientRoom.size}`);
    if (clientRoom.size === 0) {
      rooms.delete(roomKey);
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// 8. Listener Initialization
server.listen(PORT, () => {
  console.log(`🚀 Unified Node Server + WebSockets running on http://localhost:${PORT}`);
});