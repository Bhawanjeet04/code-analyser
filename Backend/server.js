import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import MVC Route Handlers
// import codeRoutes from './routes/codeRoutes.js';
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

// 2. Database Layer Connectivity (M)
mongoose.connect(MONGO_URI)
  .then(() => console.log('📁 MongoDB Connection established successfully.'))
  .catch((err) => console.error('❌ Database connectivity error:', err.message));

// 3. MVC Express Route Configurations (C)
// app.use('/api/code', codeRoutes);
app.use('/api/auth', authRoutes);

// 4. API Gateway Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'Server Operational', 
    architecture: 'MVC Decoupled Layout' 
  });
});

// 5. Global Error Handling Middleware fallback
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected internal routing server error occurred.' });
});

// 6. Listener Initialization
app.listen(PORT, () => {
  console.log(`🚀 MVC Express Server running on http://localhost:${PORT}`);
});