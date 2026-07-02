// Backend/routes/authRoutes.js
import express from 'express';
import { 
  register, 
  login, 
  googleAuthCallback,
  updatePasswordKey,
  updateAvatarSelection,
  deleteUserAccountNode
} from '../controllers/authController.js';

const router = express.Router();

// Public Gateways
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuthCallback);

// 🚀 NEW: Profile Settings Modifiers
router.post('/update-password', updatePasswordKey);
router.post('/update-avatar', updateAvatarSelection);
router.post('/delete-account', deleteUserAccountNode);

export default router;