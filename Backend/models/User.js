import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows Google users to safely skip this entry on initial token generation
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; } 
  },
  googleId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);