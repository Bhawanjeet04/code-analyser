// Frontend/src/components/GoLiveButton.jsx
import { useState } from 'react';
import ShareFilesModal from './ShareFilesModal';

export default function GoLiveButton({ projectFiles, userSession, onBeforeOpen }) {
  const [showModal, setShowModal] = useState(false);

  const handleOpen = async () => {
    if (onBeforeOpen) await onBeforeOpen(); // flush current editor content to DB first
    setShowModal(true);
  };

  return (
    <>
      <button
        className="h-9 bg-gradient-to-r from-[#6366f1] to-[#7c3aed] hover:opacity-90 text-white text-xs font-bold px-4 rounded-lg transition-all shadow-md cursor-pointer tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={handleOpen}
        disabled={!projectFiles || projectFiles.length === 0}
      >
        Go Live & Share
      </button>
      {showModal && (
        <ShareFilesModal
          files={projectFiles}
          userSession={userSession}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}