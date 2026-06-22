import { User } from '../models/User.js';

export const register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const newUser = await User.create({ email, password });
    return res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) { 
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    return res.status(200).json({ message: 'Login successful', userId: user._id });
  } catch (error) {
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
};

export const googleAuthCallback = async (req, res) => {
  const { email, googleId, avatar } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, googleId, avatar });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
    return res.status(200).json({ message: 'Google authentication successful', userId: user._id });
  } catch (error) {
    return res.status(500).json({ error: 'Google OAuth pipeline bridge error.' });
  }
};