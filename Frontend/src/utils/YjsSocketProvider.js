// Frontend/src/utils/YjsSocketProvider.js
import * as syncProtocol from 'y-protocols/sync.js';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

/**
 * Usage for personal/room code editor:
 *   new YjsWsProvider(ydoc, { context: 'code', userId, roomId, fileName })
 *
 * Usage for live-share session:
 *   new YjsWsProvider(ydoc, { context: 'live', roomId, userId })
 *
 * onLanguage(lang) fires when the server sends the file's stored language,
 * or when another peer changes it (only relevant for context: 'code').
 *
 * onContributors(list) fires whenever the server broadcasts an updated
 * contributor list (only relevant for context: 'live').
 */
export class YjsWsProvider {
  constructor(ydoc, params, { onLanguage, onContributors, onRemoved, onError, onClosed } = {}) {
    this.ydoc = ydoc;
    this.awareness = new awarenessProtocol.Awareness(ydoc);
    this.onLanguage = onLanguage;
    this.onContributors = onContributors;
    this.onRemoved = onRemoved;
    this.onError = onError;
    this.onClosed = onClosed;

    const query = new URLSearchParams(params).toString();
    this.ws = new WebSocket(`${WS_BASE}/sync?${query}`);

    this._onMessage = this._onMessage.bind(this);
    this._onDocUpdate = this._onDocUpdate.bind(this);
    this._onAwarenessUpdate = this._onAwarenessUpdate.bind(this);

    this.ws.addEventListener('message', this._onMessage);
    ydoc.on('update', this._onDocUpdate);
    this.awareness.on('update', this._onAwarenessUpdate);

    // Kick off the sync handshake ourselves: send our (typically empty) state
    // vector immediately on connect. This is what prompts the server to reply
    // with the actual document content as a Step2 diff. Without this, a brand
    // new client never receives existing content — it only reacts to the
    // server's own Step1, which asks *us* what we have, not the other way around.
    this.ws.addEventListener('open', () => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeSyncStep1(encoder, this.ydoc);
      this._send({ type: 'YJS_SYNC', data: Array.from(encoding.toUint8Array(encoder)) });
    });
  }

  _send(payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendLanguageChange(language) {
    this._send({ type: 'LANGUAGE_CHANGE', language });
  }

  sendRemoveCollaborator(targetUserId) {
    this._send({ type: 'REMOVE_COLLABORATOR', targetUserId });
  }

  sendCloseRoom() {
    this._send({ type: 'CLOSE_ROOM' });
  }

  _onMessage(event) {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'YJS_SYNC') {
      const decoder = decoding.createDecoder(new Uint8Array(msg.data));
      const encoder = encoding.createEncoder();
      decoding.readVarUint(decoder);
      encoding.writeVarUint(encoder, 0);
      syncProtocol.readSyncMessage(decoder, encoder, this.ydoc, this);
      if (encoding.length(encoder) > 1) {
        this._send({ type: 'YJS_SYNC', data: Array.from(encoding.toUint8Array(encoder)) });
      }
      if (msg.language && this.onLanguage) this.onLanguage(msg.language);
    }

    if (msg.type === 'YJS_AWARENESS') {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, new Uint8Array(msg.data), this);
    }

    if (msg.type === 'LANGUAGE_CHANGE' && this.onLanguage) {
      this.onLanguage(msg.language);
    }

    if (msg.type === 'CONTRIBUTORS_UPDATE' && this.onContributors) {
      this.onContributors({ contributors: msg.contributors, lineOwners: msg.lineOwners });
    }

    if (msg.type === 'REMOVED_FROM_ROOM' && this.onRemoved) {
      this.onRemoved();
    }

    if (msg.type === 'ROOM_CLOSED' && this.onClosed) {
      this.onClosed();
    }

    if (msg.type === 'ERROR') {
      if (this.onError) {
        this.onError(msg.message);
      } else {
        console.error('Sync error:', msg.message);
      }
    }
  }

  _onDocUpdate(update, origin) {
    if (origin === this) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    syncProtocol.writeUpdate(encoder, update);
    this._send({ type: 'YJS_SYNC', data: Array.from(encoding.toUint8Array(encoder)) });
  }

  _onAwarenessUpdate({ added, updated, removed }, origin) {
    if (origin === this) return;
    const changed = added.concat(updated, removed);
    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed);
    this._send({ type: 'YJS_AWARENESS', data: Array.from(update) });
  }

  destroy() {
    this.ydoc.off('update', this._onDocUpdate);
    this.awareness.off('update', this._onAwarenessUpdate);
    this.ws.close();
  }
}