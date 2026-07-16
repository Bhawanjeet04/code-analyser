// Backend/controllers/roomController.js
import { nanoid } from 'nanoid';
import Room from '../models/Room.js';
import { Code } from '../models/Code.js';

export const createRoom = async (req, res) => {
  try {
    const { fileId, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId.' });
    }
    if (!fileId) {
      return res.status(400).json({ message: 'Select a file to share.' });
    }

    // Only allow sharing a file the requester actually owns
    const file = await Code.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const roomId = nanoid(10);

    const room = await Room.create({
      roomId,
      creator: userId,
      filename: file.fileName,
      language: file.language || 'javascript',
      content: file.codeContent || ''
    });

    res.status(201).json({ roomId: room.roomId });
  } catch (err) {
    console.error('createRoom error:', err);
    res.status(500).json({ message: 'Failed to create live room.' });
  }
};

export const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found or has ended.' });

    res.json({
      roomId: room.roomId,
      filename: room.filename,
      language: room.language,
      content: room.content,
      creator: room.creator
    });
  } catch (err) {
    console.error('getRoom error:', err);
    res.status(500).json({ message: 'Failed to fetch room.' });
  }
};