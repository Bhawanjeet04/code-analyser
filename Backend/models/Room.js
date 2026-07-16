// Backend/models/Room.js
import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  content: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Room', roomSchema);