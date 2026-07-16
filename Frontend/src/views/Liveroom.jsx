// Frontend/src/views/Liveroom.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import Editor from '@monaco-editor/react';
import { YjsWsProvider } from '../utils/YjsSocketProvider';
import { FaCode, FaUsers, FaCrown, FaArrowLeft, FaSave, FaUserSlash } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const HIGHLIGHT_STYLE_ID = 'contributor-highlight-style';

function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .contributor-highlight-line {
      background: rgba(139, 92, 246, 0.18);
    }
  `;
  document.head.appendChild(style);
}

function ContributorBadge({ avatar, username }) {
  const display = avatar || (username || '?').charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-extrabold flex items-center justify-center border border-white/10 shadow-md shrink-0 select-none">
      {display}
    </div>
  );
}

export default function LiveRoom({ userSession }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [editorReady, setEditorReady] = useState(false);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [lineOwners, setLineOwners] = useState([]);
  const [showContributors, setShowContributors] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [removedByHost, setRemovedByHost] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveContext, setLeaveContext] = useState(null); // 'manual' | 'removed' | 'closed'
  const [leaveSaveName, setLeaveSaveName] = useState('');
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const [showExitMenu, setShowExitMenu] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const panelRef = useRef(null);
  const decorationsRef = useRef([]);

  const myAvatar = localStorage.getItem('moora_avatar') || '';
  const myUsername = localStorage.getItem('moora_username') || 'User';

  useEffect(() => {
    ensureHighlightStyle();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'This live session could not be found.');
          return;
        }

        setRoom(data);
      } catch (err) {
        console.error('Failed to load live room:', err);
        setError('This live session could not be found. It may have ended.');
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (!room || !editorReady) return;

    const ydoc = new Y.Doc();
    const provider = new YjsWsProvider(
      ydoc,
      { context: 'live', roomId, userId: userSession },
      {
        onContributors: ({ contributors: c, lineOwners: lo }) => {
          setContributors(c);
          setLineOwners(lo);
        },
        onRemoved: () => {
          bindingRef.current?.destroy();
          providerRef.current?.destroy();
          ydocRef.current?.destroy();
          setLeaveSaveName(room?.filename || 'untitled.txt');
          setLeaveContext('removed');
          setShowLeaveModal(true);
        },
        onClosed: () => {
          bindingRef.current?.destroy();
          providerRef.current?.destroy();
          ydocRef.current?.destroy();
          try {
            localStorage.removeItem(`moora_active_room_${userSession}`);
          } catch (err) {
            console.error('Failed to clear active room shortcut:', err);
          }
          setLeaveSaveName(room?.filename || 'untitled.txt');
          setLeaveContext('closed');
          setShowLeaveModal(true);
        },
        onError: (message) => {
          setError(message);
        },
      }
    );
    const ytext = ydoc.getText('content');
    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );

    ydocRef.current = ydoc;
    providerRef.current = provider;
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [room, editorReady, roomId, userSession]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowContributors(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply/clear highlight decorations whenever the selected contributor or
  // line ownership data changes.
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    if (!highlightedUserId) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const ranges = [];
    lineOwners.forEach((ownerId, idx) => {
      if (ownerId === highlightedUserId) {
        const lineNumber = idx + 1;
        ranges.push({
          range: new monacoRef.current.Range(lineNumber, 1, lineNumber, 1),
          options: { isWholeLine: true, className: 'contributor-highlight-line' },
        });
      }
    });

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, ranges);
  }, [highlightedUserId, lineOwners]);

  const handleContributorClick = (userId) => {
    setHighlightedUserId((prev) => (prev === userId ? null : userId));
  };

  const getActiveRoomKey = () => `moora_active_room_${userSession}`;

  const finalizeManualExit = () => {
    if (isHost && providerRef.current) {
      providerRef.current.sendCloseRoom();
    }
    try {
      localStorage.removeItem(getActiveRoomKey());
    } catch (err) {
      console.error('Failed to clear active room shortcut:', err);
    }
    navigate('/dashboard');
  };

  const proceedAfterLeaveDecision = () => {
    setShowLeaveModal(false);
    if (leaveContext === 'manual') {
      finalizeManualExit();
    } else if (leaveContext === 'removed') {
      setRemovedByHost(true);
    } else if (leaveContext === 'closed') {
      setRoomEnded(true);
    }
  };

  const handleSaveBeforeLeave = async () => {
    const name = leaveSaveName.trim();
    if (!name) return;
    setIsSavingBeforeLeave(true);
    try {
      await fetch(`${API_BASE}/api/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession,
          roomId: null,
          language: room?.language || 'javascript',
          code: editorRef.current ? editorRef.current.getValue() : '',
          fileName: name,
        }),
      });
    } catch (err) {
      console.error('Failed to save before leaving:', err);
      alert('Could not save your copy, but you can still leave.');
    } finally {
      setIsSavingBeforeLeave(false);
    }
    proceedAfterLeaveDecision();
  };

  const handleLeaveWithoutSaving = () => {
    proceedAfterLeaveDecision();
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    setLeaveContext(null);
  };

  const handleGoToDashboard = () => {
    try {
      localStorage.setItem(getActiveRoomKey(), JSON.stringify({ roomId, filename: room?.filename }));
    } catch (err) {
      console.error('Failed to save active room shortcut:', err);
    }
    navigate('/dashboard');
  };

  const handleRemoveCollaborator = (targetUserId, targetUsername) => {
    if (!providerRef.current) return;
    const confirmed = window.confirm(`Remove ${targetUsername} from this live session?`);
    if (!confirmed) return;
    providerRef.current.sendRemoveCollaborator(targetUserId);
  };

  const handleRunCompiler = async () => {
    if (!room) return;
    setIsExecuting(true);
    setOutput('> Executing Code...');

    const currentCode = editorRef.current ? editorRef.current.getValue() : '';

    try {
      const res = await fetch(`${API_BASE}/api/code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language: room.language, input: stdin })
      });

      const data = await res.json();
      if (!res.ok) {
        setOutput(`Error executing the code:\n${data.error || 'Execution failure.'}`);
        return;
      }

      if (data.stderr) {
        setOutput(data.stderr);
      } else {
        setOutput(data.stdout || '> Process exited successfully with no output streams.');
      }
    } catch (err) {
      setOutput('Connection Failure');
    } finally {
      setIsExecuting(false);
    }
  };

  const openSaveAsModal = () => {
    setSaveAsName(room?.filename || 'untitled.txt');
    setShowSaveAsModal(true);
  };

  const handleSaveAsSubmit = async (e) => {
    e.preventDefault();
    const name = saveAsName.trim();
    if (!name || !room) return;

    const currentCode = editorRef.current ? editorRef.current.getValue() : '';
    setIsSavingCopy(true);

    try {
      const res = await fetch(`${API_BASE}/api/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession,
          roomId: null,
          language: room.language,
          code: currentCode,
          fileName: name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || 'Could not save this file to your workspace.');
        return;
      }

      setShowSaveAsModal(false);
      alert(`Saved as "${name}" in your Dashboard files.`);
    } catch (err) {
      console.error('Failed to save live file to workspace:', err);
      alert('Could not save this file to your workspace. Please try again.');
    } finally {
      setIsSavingCopy(false);
    }
  };

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090e] text-slate-400 text-sm">
        {error}
      </div>
    );
  }

  if (removedByHost) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-[#09090e] text-slate-300 text-sm px-4 text-center">
        <p>The host has removed you as a collaborator from this session.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="h-9 bg-[#151426] hover:bg-[#1c1a30] border border-slate-800 text-slate-300 text-xs font-bold px-4 rounded-lg transition-all cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (roomEnded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-[#09090e] text-slate-300 text-sm px-4 text-center">
        <p>The host has ended this live session.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="h-9 bg-[#151426] hover:bg-[#1c1a30] border border-slate-800 text-slate-300 text-xs font-bold px-4 rounded-lg transition-all cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const activeCount = contributors.filter((c) => c.active).length;
  const sortedContributors = [...contributors].sort((a, b) => b.linesWritten - a.linesWritten);
  const isHost = room && userSession && String(room.creator) === String(userSession);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090e] text-[#C9D1D9]">
      <header className="h-14 border-b border-[#1b1b24] bg-[#0c0c14] flex items-center gap-3 px-4 shrink-0">
        <button
          onClick={() => setShowExitModal(true)}
          title="Back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <FaArrowLeft size={14} />
        </button>

        <FaCode className="text-lg text-[#8B5CF6]" />
        <span className="text-xs font-bold text-slate-300 truncate">
          {room ? room.filename : 'Loading...'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse ml-1" />

        <div className="ml-auto flex items-center gap-2 relative" ref={panelRef}>
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-extrabold flex items-center justify-center border border-white/10 shadow-md shrink-0 select-none"
            title={myUsername}
          >
            {myAvatar || myUsername.charAt(0).toUpperCase()}
          </div>

          <button
            onClick={() => setShowContributors((v) => !v)}
            className="h-8 flex items-center gap-1.5 bg-[#151426] hover:bg-[#1c1a30] border border-slate-800 text-slate-300 text-[11px] font-bold px-3 rounded-lg transition-all cursor-pointer"
          >
            <FaUsers size={12} />
            {activeCount}
          </button>

          {showContributors && (
            <div className="absolute right-0 top-10 w-72 rounded-xl bg-[#12111f] border border-[#1b1b2c] p-3 shadow-2xl z-30">
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Contributors
                </h4>
                {highlightedUserId && (
                  <button
                    onClick={() => setHighlightedUserId(null)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    Clear highlight
                  </button>
                )}
              </div>
              {sortedContributors.length === 0 ? (
                <p className="text-[11px] text-slate-600 italic px-1 py-2">No contributors yet.</p>
              ) : (
                <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {sortedContributors.map((c) => (
                    <li key={c.userId} className="group/contrib flex items-center gap-1">
                      <button
                        onClick={() => handleContributorClick(c.userId)}
                        className={`flex-1 flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                          highlightedUserId === c.userId ? 'bg-purple-500/15 ring-1 ring-purple-500/40' : 'hover:bg-white/5'
                        }`}
                      >
                        <ContributorBadge avatar={c.avatar} username={c.username} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {c.username}
                            </span>
                            {c.isCreator && <FaCrown size={10} className="text-amber-400 shrink-0" />}
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                c.active ? 'bg-emerald-400' : 'bg-slate-700'
                              }`}
                              title={c.active ? 'Currently online' : 'Offline'}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {c.linesWritten} {c.linesWritten === 1 ? 'line' : 'lines'} in file
                          </span>
                        </div>
                      </button>

                      {isHost && !c.isCreator && (
                        <button
                          onClick={() => handleRemoveCollaborator(c.userId, c.username)}
                          title={`Remove ${c.username}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/contrib:opacity-100 transition-all cursor-pointer shrink-0"
                        >
                          <FaUserSlash size={11} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={openSaveAsModal}
            title="Save to my Dashboard files"
            className="h-8 flex items-center gap-1.5 bg-[#151426] hover:bg-[#1c1a30] border border-slate-800 text-slate-300 text-[11px] font-bold px-3 rounded-lg transition-all cursor-pointer"
          >
            <FaSave size={12} />
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Live session link copied to clipboard!');
            }}
            className="h-8 bg-[#1e1b4b] hover:bg-[#2e2a75] text-[#c7d2fe] border border-[#4338ca] text-[11px] font-bold px-3 rounded-lg transition-all cursor-pointer"
          >
            Copy Link
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-hidden bg-[#06060a]">
        <section className="flex-1 rounded-2xl border border-[#1b1b24] bg-[#0c0c12] overflow-hidden flex flex-col relative shadow-xl min-h-0">
          <div className="flex-1 min-h-0 relative">
            {room && (
              <Editor
                height="100%"
                theme="vs-dark"
                language={room.language}
                path={room.filename}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  setEditorReady(true);
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                }}
              />
            )}

            {room && (
              <div className="absolute bottom-6 right-6 z-10">
                <button
                  onClick={handleRunCompiler}
                  disabled={isExecuting}
                  className={`h-11 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                    isExecuting
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:scale-105 border border-[#8b5cf6]/40 shadow-indigo-500/20'
                  }`}
                >
                  {isExecuting ? 'Executing...' : 'Run Code'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="w-full lg:w-[420px] flex flex-col gap-3 shrink-0 h-full overflow-hidden">
          <div className="flex-1 bg-[#0c0c12] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-lg min-h-[140px]">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">
              Input
            </h4>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="flex-1 w-full bg-[#07070b] text-slate-300 border border-[#1b1b24] rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-[#312e4f] transition-all resize-none shadow-inner leading-relaxed placeholder:text-slate-600"
              placeholder="Enter program input..."
            />
          </div>

          <div className="flex-[1.6] bg-[#07070b] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-[#1b1b24] pb-2 mb-2.5 shrink-0">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Output</h4>
              <button
                onClick={() => setOutput('')}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wide px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
              >
                Clear Output
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-500 leading-relaxed p-3 bg-black/30 rounded-xl border border-white/[0.01] select-text">
              {output}
            </div>
          </div>
        </section>
      </div>

      {showSaveAsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
              Save to My Files
            </h3>
            <p className="text-slate-500 text-[11px] mb-4">
              Saves the current content into your own Dashboard workspace under this name. It won't affect the shared live session.
            </p>
            <form onSubmit={handleSaveAsSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                disabled={isSavingCopy}
                className="w-full bg-[#1b192e] border border-slate-800 rounded-lg h-10 px-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                required
              />
              <div className="flex gap-2 justify-end text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowSaveAsModal(false)}
                  disabled={isSavingCopy}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCopy}
                  className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingCopy ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
              Leave this session?
            </h3>
            <p className="text-slate-500 text-[11px] mb-5">
              You can exit the room for good, or head to your Dashboard and jump back in anytime with one click.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleGoToDashboard}
                className="w-full h-10 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-left"
              >
                Go to Dashboard <span className="font-normal text-purple-200">— keep a shortcut back to this room</span>
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setLeaveSaveName(room?.filename || 'untitled.txt');
                  setLeaveContext('manual');
                  setShowLeaveModal(true);
                }}
                className="w-full h-10 px-4 bg-[#1b192e] hover:bg-[#242238] border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer text-left"
              >
                Exit Room{' '}
                <span className="font-normal text-slate-500">
                  {isHost ? '— ends the session for everyone' : '— leave for good'}
                </span>
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full h-9 text-slate-500 hover:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
              {leaveContext === 'removed'
                ? 'You were removed'
                : leaveContext === 'closed'
                ? 'Session ended'
                : 'Leaving the room'}
            </h3>
            <p className="text-slate-500 text-[11px] mb-4">
              {leaveContext === 'manual'
                ? 'Save a copy of the current code to your Dashboard files before you go, or leave without saving.'
                : "The live connection has ended, but your current code is still right here. Save a copy before it's gone, or continue without saving."}
            </p>

            <div className="mb-4">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">File name</span>
              <input
                type="text"
                value={leaveSaveName}
                onChange={(e) => setLeaveSaveName(e.target.value)}
                disabled={isSavingBeforeLeave}
                className="w-full mt-1 bg-[#1b192e] border border-slate-800 rounded-lg h-10 px-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-600 mt-1.5">
                Keep the same name to overwrite a file you've already saved, or change it to save as a new copy.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveBeforeLeave}
                disabled={isSavingBeforeLeave || !leaveSaveName.trim()}
                className="w-full h-10 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingBeforeLeave ? 'Saving...' : 'Save & Leave'}
              </button>
              <button
                onClick={handleLeaveWithoutSaving}
                disabled={isSavingBeforeLeave}
                className="w-full h-10 bg-[#1b192e] hover:bg-[#242238] border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Leave without Saving
              </button>
              {leaveContext === 'manual' && (
                <button
                  onClick={handleCancelLeave}
                  disabled={isSavingBeforeLeave}
                  className="w-full h-9 text-slate-500 hover:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}