// Frontend/src/components/ShareFilesModal.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ShareFilesModal({ files, userSession, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleShare = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: selectedId, userId: userSession })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Could not start the live session.');
        return;
      }

      navigate(`/live/${data.roomId}`);
    } catch (err) {
      console.error('Failed to create live room:', err);
      alert('Could not start the live session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
      <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
          Select a file to share
        </h3>
        <p className="text-slate-500 text-[11px] mb-4">
          Anyone with the link can join and edit this file live.
        </p>

        <ul className="max-h-64 overflow-y-auto space-y-1 mb-4">
          {files.length === 0 ? (
            <li className="text-[11px] text-slate-600 italic p-2">No files in your workspace yet.</li>
          ) : (
            files.map((file) => (
              <li key={file._id}>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="share-file"
                    checked={selectedId === file._id}
                    onChange={() => setSelectedId(file._id)}
                    className="accent-purple-500"
                  />
                  <span className="truncate">{file.fileName}</span>
                </label>
              </li>
            ))
          )}
        </ul>

        <div className="flex gap-2 justify-end text-xs font-bold">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={loading || !selectedId}
            className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : 'Go Live'}
          </button>
        </div>
      </div>
    </div>
  );
}