import express from 'express';
import { register, login, googleAuthCallback } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuthCallback);

export default router;