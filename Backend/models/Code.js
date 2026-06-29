// Backend/models/Code.js
import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: String,
    default: null 
  },
  language: {
    type: String,
    required: true,
    default: 'cpp'
  },
  codeContent: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: 'main.cpp'
  }
}, { timestamps: true });

// This new index tells MongoDB to allow uniqueness per file name context!
codeSchema.index({ userId: 1, roomId: 1, fileName: 1 }, { unique: true });

export const Code = mongoose.model('Code', codeSchema);