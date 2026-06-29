// Backend/routes/codeRoutes.js
import express from 'express';
import { 
  executeCode, 
  analyzeCode, 
  saveWorkspaceCode, 
  loadWorkspaceCode,
  loadAllFiles // 🚀 FIXED: Explicitly added this missing import!
} from '../controllers/codeController.js';

const router = express.Router();

// Execution & Auditing Channels
router.post('/execute', executeCode);
router.post('/analyze', analyzeCode);

// Database Persistence Routing Contracts
router.post('/save', saveWorkspaceCode);
router.get('/load', loadWorkspaceCode);
router.get('/files', loadAllFiles);

export default router;