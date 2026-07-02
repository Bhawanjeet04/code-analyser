// Backend/controllers/authController.js
import { User } from '../models/User.js';
import { Code } from '../models/Code.js';

/**
 * @desc Registers a fresh user with an explicit custom username field
 */
// Backend/controllers/authController.js

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Username, email, and password are required fields.' });
  }
  try {
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) return res.status(400).json({ error: 'This username is already taken.' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'An account with this email already exists.' });

    const newUser = await User.create({ 
      username: username.trim(), 
      email, 
      password 
    });

    return res.status(201).json({ 
      message: 'User registered successfully', 
      userId: newUser._id,
      user: { id: newUser._id, username: newUser.username, avatar: newUser.avatar || "" } // 🚀 Added avatar
    });
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
    // 🚀 FIXED: Return the saved database avatar field back to the client layout
    return res.status(200).json({ 
      message: 'Login successful', 
      userId: user._id,
      user: { id: user._id, username: user.username, avatar: user.avatar || "" } 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
};

/**
 * @desc Google OAuth authentication gateway hook
 */
export const googleAuthCallback = async (req, res) => {
  const { email, googleId, avatar } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      // Auto-generate fallback usernames for third party inputs
      const derivedUsername = email.split('@')[0] + Math.floor(100 + Math.random() * 900);
      user = await User.create({ username: derivedUsername, email, googleId, avatar });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
    return res.status(200).json({ 
      message: 'Google authentication successful', 
      userId: user._id,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Google OAuth pipeline bridge error.' });
  }
};

/**
 * @desc 🚀 NEW: Modifies active credentials in DB
 */
export const updatePasswordKey = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Profile account node not found." });

    if (user.password !== currentPassword) {
      return res.status(400).json({ error: "Current password key is invalid." });
    }

    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to apply profile changes." });
  }
};

/**
 * @desc 🚀 NEW: Binds avatar design configurations
 */
export const updateAvatarSelection = async (req, res) => {
  const { userId, avatar } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { avatar });
    return res.status(200).json({ message: "Avatar synchronized successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Avatar storage assignment error." });
  }
};

/**
 * @desc 🚀 NEW: Destroys active accounts and drops corresponding document files completely
 */
export const deleteUserAccountNode = async (req, res) => {
  const { userId } = req.body;
  try {
    // Cascade delete: wipe clean all files belonging to this specific identifier to clean memory leaks
    await Code.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: "Account context scrubbed successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Destructive pipeline deployment failure." });
  }
};