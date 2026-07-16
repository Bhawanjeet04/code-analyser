// Backend/socket/yjsSocket.js
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync.js';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import { Code } from '../models/Code.js';
import Room from '../models/Room.js';
import { User } from '../models/User.js';

// Registry of live Yjs docs in memory, one per open file (personal or shared).
const docs = new Map();

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(entry, payload) {
  entry.clients.forEach((client) => send(client, payload));
}

function broadcastContributors(entry) {
  if (entry.context !== 'live') return;
  broadcast(entry, {
    type: 'CONTRIBUTORS_UPDATE',
    contributors: Array.from(entry.contributors.values()),
    lineOwners: entry.lineOwners,
  });
}

function recomputeActiveContributors(entry) {
  const activeIds = new Set();
  entry.clients.forEach((client) => {
    if (client.userId) activeIds.add(client.userId);
  });
  entry.contributors.forEach((c) => {
    c.active = activeIds.has(c.userId);
  });
}

// Finds the shared prefix/suffix between two line arrays so we only need to
// re-attribute the lines that actually changed, not the whole document.
function diffLineRange(beforeLines, afterLines) {
  const maxCommon = Math.min(beforeLines.length, afterLines.length);
  let prefix = 0;
  while (prefix < maxCommon && beforeLines[prefix] === afterLines[prefix]) prefix++;

  let suffix = 0;
  while (
    suffix < maxCommon - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  return {
    beforeStart: prefix,
    beforeEnd: beforeLines.length - suffix, // exclusive
    afterStart: prefix,
    afterEnd: afterLines.length - suffix, // exclusive
  };
}

// Re-attributes ownership for the lines that changed in this edit to `userId`,
// keeping each contributor's live line count in sync with actual current ownership.
function applyLineOwnership(entry, beforeLines, afterLines, userId) {
  const { beforeStart, beforeEnd, afterStart, afterEnd } = diffLineRange(beforeLines, afterLines);
  if (beforeStart === beforeEnd && afterStart === afterEnd) return; // nothing changed

  const removedOwners = entry.lineOwners.slice(beforeStart, beforeEnd);
  removedOwners.forEach((ownerId) => {
    if (!ownerId) return;
    const contributor = entry.contributors.get(ownerId);
    if (contributor) contributor.linesWritten = Math.max(0, contributor.linesWritten - 1);
  });

  const newOwnersCount = afterEnd - afterStart;
  const newOwners = new Array(newOwnersCount).fill(userId);
  entry.lineOwners.splice(beforeStart, beforeEnd - beforeStart, ...newOwners);

  const contributor = entry.contributors.get(userId);
  if (contributor) contributor.linesWritten += newOwnersCount;
}

async function loadInitialContent(context, params) {
  if (context === 'code') {
    const { userId, roomId, fileName } = params;
    const doc = await Code.findOne({ userId, roomId: roomId || null, fileName });
    return { content: doc?.codeContent ?? '', language: doc?.language ?? 'cpp' };
  }

  if (context === 'live') {
    const { roomId } = params;
    const room = await Room.findOne({ roomId });
    if (!room) return null;
    return {
      content: room.content ?? '',
      language: room.language ?? 'javascript',
      creatorId: room.creator?.toString() ?? null,
    };
  }

  return null;
}

async function persist(entry) {
  const content = entry.ydoc.getText('content').toString();

  if (entry.context === 'code') {
    const { userId, roomId, fileName } = entry.params;
    try {
      await Code.findOneAndUpdate(
        { userId, roomId: roomId || null, fileName },
        { $set: { codeContent: content } },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to persist code doc:', err);
    }
    return;
  }

  if (entry.context === 'live') {
    const { roomId } = entry.params;
    try {
      await Room.updateOne({ roomId }, { $set: { content } });
    } catch (err) {
      console.error('Failed to persist live-share room:', err);
    }
  }
}

function scheduleSave(entry) {
  clearTimeout(entry.saveTimeout);
  entry.saveTimeout = setTimeout(() => persist(entry), 1500);
}

function getDocKey(context, params) {
  if (context === 'code') return `code:${params.userId}:${params.roomId || 'solo'}:${params.fileName}`;
  return `live:${params.roomId}`;
}

async function getOrCreateEntry(context, params) {
  const key = getDocKey(context, params);
  let entry = docs.get(key);
  if (entry) return entry;

  const initial = await loadInitialContent(context, params);
  if (initial === null) return null; // e.g. live room doesn't exist

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('content');
  if (initial.content) ytext.insert(0, initial.content);

  const awareness = new awarenessProtocol.Awareness(ydoc);
  const initialLineCount = ytext.toString().split('\n').length;

  entry = {
    key,
    context,
    params,
    ydoc,
    awareness,
    language: initial.language,
    creatorId: initial.creatorId ?? null,
    contributors: new Map(), // live context only: userId -> { userId, username, avatar, linesWritten, active, isCreator }
    lineOwners: new Array(initialLineCount).fill(null), // live context only: line index -> owning userId
    bannedUserIds: new Set(), // live context only: userIds the host has removed
    clients: new Set(),
    saveTimeout: null,
  };
  docs.set(key, entry);
  return entry;
}

function handleSyncMessage(entry, ws, msg) {
  const beforeLines =
    entry.context === 'live' ? entry.ydoc.getText('content').toString().split('\n') : null;

  const decoder = decoding.createDecoder(new Uint8Array(msg.data));
  const respEncoder = encoding.createEncoder();
  decoding.readVarUint(decoder);
  encoding.writeVarUint(respEncoder, 0);
  syncProtocol.readSyncMessage(decoder, respEncoder, entry.ydoc, ws);

  if (encoding.length(respEncoder) > 1) {
    send(ws, { type: 'YJS_SYNC', data: Array.from(encoding.toUint8Array(respEncoder)) });
  }

  entry.clients.forEach((client) => {
    if (client !== ws) send(client, { type: 'YJS_SYNC', data: msg.data });
  });

  // Real-time per-line "blame" attribution for live sessions: whichever
  // lines this edit touched now belong to this sender, and counts update
  // immediately (both the sender's and whoever previously owned those lines).
  if (entry.context === 'live' && ws.userId) {
    const afterLines = entry.ydoc.getText('content').toString().split('\n');
    applyLineOwnership(entry, beforeLines, afterLines, ws.userId);
    broadcastContributors(entry);
  }

  scheduleSave(entry);
}

function handleAwarenessMessage(entry, ws, msg) {
  awarenessProtocol.applyAwarenessUpdate(entry.awareness, new Uint8Array(msg.data), ws);
  entry.clients.forEach((client) => {
    if (client !== ws) send(client, { type: 'YJS_AWARENESS', data: msg.data });
  });
}

function handleLanguageChangeMessage(entry, ws, msg) {
  if (entry.context !== 'code') return;
  entry.language = msg.language;
  Code.findOneAndUpdate(
    { userId: entry.params.userId, roomId: entry.params.roomId || null, fileName: entry.params.fileName },
    { $set: { language: msg.language } },
    { upsert: true }
  ).catch((err) => console.error('Failed to persist language change:', err));

  entry.clients.forEach((client) => {
    if (client !== ws) send(client, { type: 'LANGUAGE_CHANGE', language: msg.language });
  });
}

function handleRemoveCollaborator(entry, ws, msg) {
  if (entry.context !== 'live') return;

  // Server-side authority check — never trust the client to self-report host status.
  if (!ws.userId || ws.userId !== entry.creatorId) {
    send(ws, { type: 'ERROR', message: 'Only the room host can remove collaborators.' });
    return;
  }

  const targetUserId = msg.targetUserId;
  if (!targetUserId || targetUserId === entry.creatorId) return; // can't remove the host, including self

  entry.bannedUserIds.add(targetUserId);
  entry.contributors.delete(targetUserId);
  broadcastContributors(entry);

  entry.clients.forEach((client) => {
    if (client.userId === targetUserId) {
      send(client, { type: 'REMOVED_FROM_ROOM' });
      client.close();
    }
  });
}

function handleCloseRoom(entry, ws) {
  if (entry.context !== 'live') return;

  if (!ws.userId || ws.userId !== entry.creatorId) {
    send(ws, { type: 'ERROR', message: 'Only the room host can close this session.' });
    return;
  }

  entry.clients.forEach((client) => {
    if (client !== ws) {
      send(client, { type: 'ROOM_CLOSED' });
      client.close();
    }
  });

  clearTimeout(entry.saveTimeout);
  persist(entry);
  docs.delete(entry.key);
}

function processMessage(entry, ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (msg.type === 'YJS_SYNC') handleSyncMessage(entry, ws, msg);
  if (msg.type === 'YJS_AWARENESS') handleAwarenessMessage(entry, ws, msg);
  if (msg.type === 'LANGUAGE_CHANGE') handleLanguageChangeMessage(entry, ws, msg);
  if (msg.type === 'REMOVE_COLLABORATOR') handleRemoveCollaborator(entry, ws, msg);
  if (msg.type === 'CLOSE_ROOM') handleCloseRoom(entry, ws);
}

/**
 * Connection URL shape (query params):
 *   Personal/room code editor: ws://host/sync?context=code&userId=<id>&roomId=<id|empty>&fileName=<name>
 *   Live-share session:        ws://host/sync?context=live&roomId=<roomId>&userId=<id>
 */
export function initYjsSocket(wss) {
  wss.on('connection', (ws, req) => {
    // CRITICAL: attach message/close listeners synchronously, before any
    // await below. The browser's WebSocket 'open' event fires almost
    // instantly and the client sends its handshake message right away — if
    // we only attach ws.on('message') after async DB lookups, that first
    // message can arrive before anyone is listening and gets silently
    // dropped (Node's EventEmitter does not queue events for late listeners).
    // So: buffer anything that arrives before setup finishes, then replay it.
    let entry = null;
    let closed = false;
    const pendingMessages = [];

    ws.on('message', (raw) => {
      if (!entry) {
        pendingMessages.push(raw);
        return;
      }
      processMessage(entry, ws, raw);
    });

    ws.on('close', () => {
      closed = true;
      if (!entry) return; // never finished joining — nothing to clean up

      entry.clients.delete(ws);
      awarenessProtocol.removeAwarenessStates(entry.awareness, [entry.ydoc.clientID], null);
      console.log(`🔴 Peer left [${entry.key}]. Active peers: ${entry.clients.size}`);

      if (entry.context === 'live') {
        recomputeActiveContributors(entry);
        broadcastContributors(entry);
      }

      if (entry.clients.size === 0) {
        clearTimeout(entry.saveTimeout);
        persist(entry);
        docs.delete(entry.key);
      }
    });

    (async () => {
      const url = new URL(req.url, 'http://internal');
      if (url.pathname !== '/sync') {
        send(ws, { type: 'ERROR', message: 'Unknown socket endpoint.' });
        ws.close();
        return;
      }

      const context = url.searchParams.get('context');
      let params;

      if (context === 'code') {
        const userId = url.searchParams.get('userId');
        const roomId = url.searchParams.get('roomId') || null;
        const fileName = url.searchParams.get('fileName');
        if (!userId || !fileName) {
          send(ws, { type: 'ERROR', message: 'Missing userId or fileName.' });
          ws.close();
          return;
        }
        params = { userId, roomId, fileName };
      } else if (context === 'live') {
        const roomId = url.searchParams.get('roomId');
        const userId = url.searchParams.get('userId');
        if (!roomId || !userId) {
          send(ws, { type: 'ERROR', message: 'Missing roomId or userId.' });
          ws.close();
          return;
        }
        params = { roomId, userId };
      } else {
        send(ws, { type: 'ERROR', message: 'Invalid or missing context.' });
        ws.close();
        return;
      }

      const resolvedEntry = await getOrCreateEntry(context, params);
      if (closed) return; // client disconnected while we were looking things up

      if (!resolvedEntry) {
        send(ws, { type: 'ERROR', message: 'Requested document could not be found.' });
        ws.close();
        return;
      }

      if (context === 'live' && resolvedEntry.bannedUserIds.has(params.userId)) {
        send(ws, { type: 'ERROR', message: 'You have been removed from this live session by the host.' });
        ws.close();
        return;
      }

      resolvedEntry.clients.add(ws);
      ws.syncEntry = resolvedEntry;

      if (context === 'live') {
        ws.userId = params.userId;
        try {
          const user = await User.findById(params.userId).select('username avatar').lean();
          if (closed) return;
          const existing = resolvedEntry.contributors.get(params.userId);
          resolvedEntry.contributors.set(params.userId, {
            userId: params.userId,
            username: user?.username || 'Guest',
            avatar: user?.avatar || '',
            linesWritten: existing?.linesWritten ?? 0,
            isCreator: resolvedEntry.creatorId === params.userId,
            active: true,
          });
        } catch (err) {
          console.error('Failed to look up user for contributor list:', err);
        }
        recomputeActiveContributors(resolvedEntry);
        broadcastContributors(resolvedEntry);
      }

      console.log(`🟢 Peer joined [${resolvedEntry.key}]. Active peers: ${resolvedEntry.clients.size}`);

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeSyncStep1(encoder, resolvedEntry.ydoc);
      send(ws, {
        type: 'YJS_SYNC',
        data: Array.from(encoding.toUint8Array(encoder)),
        language: resolvedEntry.language,
      });

      const states = resolvedEntry.awareness.getStates();
      if (states.size > 0) {
        const update = awarenessProtocol.encodeAwarenessUpdate(resolvedEntry.awareness, Array.from(states.keys()));
        send(ws, { type: 'YJS_AWARENESS', data: Array.from(update) });
      }

      // Now that setup is fully done, flip the switch and replay anything
      // the client sent while we were still awaiting the lookups above.
      entry = resolvedEntry;
      pendingMessages.forEach((raw) => processMessage(entry, ws, raw));
      pendingMessages.length = 0;
    })();
  });
}