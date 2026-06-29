// Frontend/src/views/DashboardPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

const BOILERPLATE_MAP = {
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++ G++ 15!" << std::endl;\n    return 0;\n}',
  python: 'print("Hello from Python 3.14!")',
  javascript: 'console.log("Hello from JavaScript via Deno!");',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java OpenJDK 25!");\n    }\n}'
};

const DISPLAY_LANG_MAP = {
  cpp: 'C++ 20',
  python: 'Python 3',
  javascript: 'JavaScript',
  java: 'Java'
};

export default function DashboardPage({ userSession, onLogout }) {
  const { roomId } = useParams(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('editor'); 
  const [language, setLanguage] = useState('cpp');
  const [editorCode, setEditorCode] = useState(BOILERPLATE_MAP.cpp);
  const [fileCode, setFileCode] = useState('// Your uploaded local file stream context read-only...');
  const [fileName, setFileName] = useState('main.cpp');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('$ Terminal initialized. Ready to execute code logs...');
  const [isExecuting, setIsExecuting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [saveStatus, setSaveStatus] = useState('Saved to cloud');
  const [isSaving, setIsSaving] = useState(false);

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [activeDockIcon, setActiveIcon] = useState('Files');

  const [fileList, setFileList] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);

  // 🚀 FIXED: Gatekeeper state flag preventing empty saves from overwriting cloud text
  const [isHydrated, setIsHydrated] = useState(false);

  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const dropdownRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchWorkspaceDirectory = async (shouldLoadFirst = false) => {
    if (!userSession) return;
    try {
      const res = await fetch(`${API_BASE}/api/code/files?userId=${userSession}&roomId=${roomId || ''}`);
      const data = await res.json();
      if (res.ok && data.files) {
        setFileList(data.files);
        
        // If files exist for this workspace/room context, rehydrate them
        if (data.files.length > 0 && (shouldLoadFirst || !editorRef.current)) {
          const targetFile = data.files.find(f => f.fileName === fileName) || data.files[0];
          setFileName(targetFile.fileName);
          setLanguage(targetFile.language);
          setEditorCode(targetFile.codeContent);
          if (editorRef.current) {
            editorRef.current.setValue(targetFile.codeContent);
          }
        }
        setIsHydrated(true); // Re-hydration completed safely
      }
    } catch (err) {
      console.error("Directory tree pull exception:", err);
      setIsHydrated(true); // Release lock on network crash to allow standard functionality
    }
  };

  useEffect(() => {
    setIsHydrated(false);
    fetchWorkspaceDirectory(true);

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLangDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      cleanUpCollaboration();
    };
  }, [roomId, userSession]);

  // Background Auto-Save Debouncer Loop
  useEffect(() => {
    if (activeTab === 'upload' || !isHydrated) return; // 🚀 FIXED: Block writes until client has fully hydrated
    
    setSaveStatus('Typing...');
    const delayDebounceTimer = setTimeout(() => {
      triggerManualWorkspaceSave(true);
    }, 1500); 

    return () => clearTimeout(delayDebounceTimer);
  }, [editorCode, language, fileName, isHydrated]);

  const cleanUpCollaboration = () => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    if (!roomId) return;
    initializeYjsSync(editor);
  };

  const initializeYjsSync = (editor) => {
    cleanUpCollaboration();
    const ydoc = new Y.Doc();
    const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    
    // Ensure room context paths are cleanly separated from the extension suffix
    const uniqueChannelName = `${roomId}-${fileName}`;
    const provider = new WebsocketProvider(WS_BASE, uniqueChannelName, ydoc);
    providerRef.current = provider;

    const ytext = ydoc.getText('monaco');
    
    // Handle loading local editor content if Yjs document is fresh/empty
    provider.on('sync', (isSynced) => {
      if (isSynced && ytext.toString() === '') {
        const currentLocalValue = editor.getValue();
        if (currentLocalValue && currentLocalValue !== BOILERPLATE_MAP[language]) {
          ytext.insert(0, currentLocalValue);
        }
      }
    });

    const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    bindingRef.current = binding;
  };

  const handleSelectFileNode = (fileRecord) => {
    setFileName(fileRecord.fileName);
    setLanguage(fileRecord.language);
    setEditorCode(fileRecord.codeContent);
    if (editorRef.current) {
      editorRef.current.setValue(fileRecord.codeContent);
    }
  };

  const handleCreateNewFileSubmit = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const name = newFileName.trim();
    let ext = name.split('.').pop();
    let derivedLang = 'cpp';
    if (ext === 'py') derivedLang = 'python';
    else if (ext === 'js') derivedLang = 'javascript';
    else if (ext === 'java') derivedLang = 'java';

    setFileName(name);
    setLanguage(derivedLang);
    setEditorCode(BOILERPLATE_MAP[derivedLang]);
    if (editorRef.current) {
      editorRef.current.setValue(BOILERPLATE_MAP[derivedLang]);
    }
    setNewFileName('');
    setShowNewFileModal(false);
    setSaveStatus('Saving changes...');

    try {
      await fetch(`${API_BASE}/api/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession,
          roomId: roomId || null,
          language: derivedLang,
          code: BOILERPLATE_MAP[derivedLang],
          fileName: name
        })
      });
      fetchWorkspaceDirectory(false); 
    } catch (err) {
      setSaveStatus('Save Failed');
    }
  };

  const triggerManualWorkspaceSave = async (isAutoSave = false) => {
    if (!userSession || !isHydrated) return; // 🚀 FIXED: Guard clause against premature saves
    if (!isAutoSave) setIsSaving(true);
    setSaveStatus('Saving changes...');

    const currentCode = editorRef.current ? editorRef.current.getValue() : editorCode;

    try {
      const res = await fetch(`${API_BASE}/api/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession,
          roomId: roomId || null,
          language,
          code: currentCode,
          fileName 
        })
      });

      if (res.ok) {
        setSaveStatus('Saved to cloud');
        if (isAutoSave) fetchWorkspaceDirectory(false); 
      } else {
        setSaveStatus('Save Failed');
      }
    } catch (err) {
      setSaveStatus('Offline (unsaved)');
    } finally {
      if (!isAutoSave) setIsSaving(false);
    }
  };

  const handleInitializeCollaboration = async () => {
    const uniqueRoomId = `room-${Math.random().toString(36).substring(2, 11)}`;
    const fullUrl = `${window.location.origin}/room/${uniqueRoomId}`;
    
    const currentCode = editorRef.current ? editorRef.current.getValue() : editorCode;
    setSaveStatus('Creating room...');
    
    try {
      // Seed the database with the current file snapshot using the new room ID
      await fetch(`${API_BASE}/api/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession,
          roomId: uniqueRoomId,
          language,
          code: currentCode,
          fileName
        })
      });

      setShareUrl(fullUrl);
      navigate(`/room/${uniqueRoomId}`);
    } catch (err) {
      console.error("Failed to seed room code structure:", err);
      navigate(`/room/${uniqueRoomId}`);
    }
  };

  const handleLocalFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileCode(event.target.result);
      setActiveTab('upload');
    };
    reader.readAsText(file);
  };

  const handleRunCompiler = async () => {
    setIsExecuting(true);
    setOutput('> Executing script binary payload inside secure sandbox...');
    
    const targetPayload = activeTab === 'editor' 
      ? (editorRef.current ? editorRef.current.getValue() : editorCode)
      : fileCode;

    try {
      const res = await fetch(`${API_BASE}/api/code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetPayload,
          language,
          input: stdin
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setOutput(`❌ Error executing payload:\n${data.error || 'Execution failure.'}`);
        return;
      }

      if (data.stderr) {
        setOutput(data.stderr);
      } else {
        setOutput(data.stdout || '> Process exited successfully with no output streams.');
      }
    } catch (err) {
      setOutput('❌ Connection Failure: Unable to establish link with compilation gateway.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTriggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    setShowAiDrawer(true);
    setAiAnalysis('### ⚡ Gathering telemetry metrics...\n> Sending source tokens to Gemini AI optimization nodes...');

    const targetPayload = activeTab === 'editor' 
      ? (editorRef.current ? editorRef.current.getValue() : editorCode)
      : fileCode;

    try {
      const res = await fetch(`${API_BASE}/api/code/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetPayload, language })
      });

      const data = await res.json();
      if (!res.ok) {
        setAiAnalysis(`### ❌ Audit Assessment Failed\n${data.error || 'AI analysis timeout.'}`);
        return;
      }
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiAnalysis('### ❌ Link Failure\nCould not pipe payload context to Express GenAI gateway.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setEditorCode(BOILERPLATE_MAP[lang]);
    if (editorRef.current) {
      editorRef.current.setValue(BOILERPLATE_MAP[lang]);
    }
    setShowLangDropdown(false);
    
    if (lang === 'cpp') setFileName('main.cpp');
    else if (lang === 'python') setFileName('main.py');
    else if (lang === 'javascript') setFileName('main.js');
    else if (lang === 'java') setFileName('Main.java');
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-[#C9D1D9] bg-[#09090e] font-sans antialiased select-none flex flex-col relative">
      
      {/* TOP BAR HEADER SECTION */}
      <header className="h-14 border-b border-[#1b1b24] bg-[#0c0c14] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect width="6" height="6" rx="1.5" fill="#8B5CF6" />
              <rect x="8" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
              <rect y="8" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
              <rect x="8" y="8" width="6" height="6" rx="1.5" fill="#8B5CF6" />
            </svg>
            <span className="text-sm font-bold tracking-tight text-white font-sohne">CoderHub</span>
            <span className="text-[10px] font-bold text-[#818cf8] bg-[#818cf8]/10 border border-[#818cf8]/20 px-2 py-0.5 rounded uppercase tracking-wider scale-90">
              {roomId ? 'Live Room' : 'Standalone IDE'}
            </span>
          </div>

          <div className="flex items-center bg-[#13131f] border border-[#1f1f2e] p-0.5 rounded-lg h-9">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 h-full rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'editor' ? 'bg-[#252538] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Code Editor Terminal
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium font-mono hidden md:inline bg-white/5 border border-white/5 px-2 py-1 rounded">
            {saveStatus === 'Saved to cloud' && '● '} {saveStatus}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerManualWorkspaceSave(false)}
            disabled={isSaving}
            className="h-9 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-bold px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? 'Saving...' : '💾 Save Project'}
          </button>

          <button
            onClick={handleTriggerAiAnalysis}
            disabled={isAnalyzing}
            className="h-9 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-xs font-bold px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isAnalyzing ? 'Auditing...' : '✨ Analyze with Gemini'}
          </button>

          {!roomId ? (
            <button
              onClick={handleInitializeCollaboration}
              className="h-9 bg-gradient-to-r from-[#6366f1] to-[#7c3aed] hover:opacity-90 text-white text-xs font-bold px-4 rounded-lg transition-all shadow-md cursor-pointer tracking-wide"
            >
              Go Live & Share
            </button>
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Room workspace URL link copied to clipboard!");
              }}
              className="h-9 bg-[#1e1b4b] hover:bg-[#2e2a75] text-[#c7d2fe] border border-[#4338ca] text-xs font-bold px-4 rounded-lg transition-all cursor-pointer"
            >
              📋 Copy Room Link
            </button>
          )}

          {/* Environment Custom Dropdown Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center justify-between bg-[#13131f] border border-[#1f1f2e] hover:border-slate-700 px-3 rounded-lg h-9 text-xs font-semibold text-white gap-2 transition-all cursor-pointer min-w-[150px]"
            >
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-500 font-bold tracking-wider uppercase block leading-none">Environment</span>
                <span className="text-slate-200 mt-0.5 block">{DISPLAY_LANG_MAP[language]}</span>
              </div>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {showLangDropdown && (
              <div className="absolute right-0 mt-1 w-full bg-[#11111a] border border-[#1b1b26] rounded-lg shadow-2xl z-50 overflow-hidden py-1 animate-fadeIn">
                {Object.keys(DISPLAY_LANG_MAP).map((langKey) => (
                  <button
                    key={langKey}
                    onClick={() => handleLanguageChange(langKey)}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      language === langKey ? 'bg-[#252538] text-purple-400 font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {DISPLAY_LANG_MAP[langKey]}
                    {language === langKey && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="h-9 bg-[#1a1926] hover:bg-[#25233c] border border-[#312e54] text-slate-200 text-xs font-semibold px-3.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center shrink-0">
            Upload File
            <input type="file" onChange={handleLocalFileUpload} className="hidden" />
          </label>

          <div className="h-4 w-[1px] bg-[#1f1f2e] mx-1" />

          <button onClick={onLogout} className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer" title="Sign Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT BOX AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-16 border-r border-[#1b1b24] bg-[#09090e] flex flex-col justify-between py-4 shrink-0 items-center">
          <div className="flex flex-col gap-5 w-full items-center">
            {['Files', 'Search', 'Git', 'Debug', 'Ext'].map((icon) => (
              <button
                key={icon}
                onClick={() => setActiveIcon(activeDockIcon === icon ? '' : icon)} 
                className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all cursor-pointer ${
                  activeDockIcon === icon ? 'bg-[#1b1b2f] text-[#8b5cf6] border border-[#2e2e4f]' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold tracking-tight font-sans">{icon}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4 items-center w-full">
            <button className="text-slate-500 hover:text-slate-300 cursor-pointer flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider">Config</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] text-white text-xs font-bold flex items-center justify-center border border-white/10 shadow-md">
              U
            </div>
          </div>
        </aside>

        {/* Sliding Drawer File Explorer Panel */}
        {activeDockIcon === 'Files' && (
          <aside className="w-56 border-r border-[#1b1b24] bg-[#0c0c14] flex flex-col shrink-0 transition-all duration-200">
            <div className="p-4 border-b border-[#1b1b24] flex items-center justify-between select-none">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Workspace Explorer</span>
              <button 
                onClick={() => setShowNewFileModal(true)}
                className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                + New File
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {fileList.length === 0 ? (
                <div className="text-[11px] text-slate-600 p-2 italic">Workspace empty. Click New File to start.</div>
              ) : (
                fileList.map((file) => (
                  <button
                    key={file._id}
                    onClick={() => handleSelectFileNode(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer group ${
                      fileName === file.fileName 
                        ? 'bg-[#1b1b2f] text-white border border-[#2e2e4f] font-semibold' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">📄 {file.fileName}</span>
                    <span className="text-[9px] opacity-40 font-mono text-slate-500">{file.language}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-hidden bg-[#06060a]">
          <section className="flex-1 rounded-2xl border border-[#1b1b24] bg-[#0c0c12] overflow-hidden flex flex-col relative shadow-xl">
            <div className="h-10 bg-[#09090e] border-b border-[#1b1b24] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 bg-[#0c0c12] border-t border-x border-[#1b1b24] h-full px-4 rounded-t-lg text-xs font-semibold text-[#8b5cf6] border-t-2 border-t-[#8b5cf6]">
                <span>📄 {fileName}</span>
                {roomId && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse ml-1" />}
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-wider">
                UTF-8 &nbsp;&bull;&nbsp; {language.toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-h-0 relative bg-[#0c0c12]">
              <Editor
                height="100%"
                theme="vs-dark"
                language={language === 'javascript' ? 'javascript' : language === 'python' ? 'python' : language === 'java' ? 'java' : 'cpp'}
                value={activeTab === 'editor' ? editorCode : fileCode}
                onChange={(val) => activeTab === 'editor' && setEditorCode(val || '')}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace",
                  minimap: { enabled: false },
                  padding: { top: 16 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  lineHeight: 22,
                  readOnly: activeTab === 'upload',
                  backgroundColor: '#0c0c12'
                }}
              />

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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  {isExecuting ? "Executing..." : "Run Code"}
                </button>
              </div>
            </div>
          </section>

          <section className="w-full lg:w-[420px] flex flex-col gap-3 shrink-0 h-full overflow-hidden">
            <div className="flex-1 bg-[#0c0c12] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-lg min-h-[140px]">
              <div className="flex items-center gap-2 mb-2 select-none shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Standard Input (stdin)</h4>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="flex-1 w-full bg-[#07070b] text-slate-300 border border-[#1b1b24] rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-[#312e4f] transition-all resize-none shadow-inner leading-relaxed placeholder:text-slate-600"
                placeholder="Inject custom program runtime arguments or structural simulation mock data rows here..."
              />
            </div>

            <div className="flex-[1.6] bg-[#07070b] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-2xl overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-[#1b1b24] pb-2 mb-2.5 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Console Output Shell</h4>
                </div>
                <button
                  onClick={() => setOutput('$ Terminal wiped clean.')}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wide px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Clear Output
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto font-mono text-xs text-[#10b981] leading-relaxed p-3 bg-black/30 rounded-xl border border-white/[0.01] select-text scrollbar-thin">
                {output}
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* Absolute Center Modal Window to Handle New Filenames */}
      {showNewFileModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">Create File Asset</h3>
            <p className="text-slate-500 text-[11px] mb-4">Include target extension tags (e.g. .cpp, .py, .js, .java) to instantly map compile profiles.</p>
            <form onSubmit={handleCreateNewFileSubmit} className="space-y-4">
              <input 
                type="text" 
                autoFocus
                placeholder="index.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-[#1b192e] border border-slate-800 rounded-lg h-10 px-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <div className="flex gap-2 justify-end text-xs font-bold">
                <button type="button" onClick={() => setShowNewFileModal(false)} className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 cursor-pointer shadow-md">Create File</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI DRAWER SECTION */}
      {showAiDrawer && (
        <div className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-[#0c0c14] border-l border-[#1b1b24] shadow-2xl z-50 flex flex-col animate-slideIn">
          <div className="h-14 border-b border-[#1b1b24] px-6 flex items-center justify-between bg-[#09090e] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <h3 className="text-xs font-bold tracking-wide uppercase text-white font-sohne">Gemini Analysis Framework</h3>
            </div>
            <button 
              onClick={() => setShowAiDrawer(false)}
              className="text-slate-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-[#1b1b24]"
            >
              ✕ Close
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm space-y-4 font-sans select-text scrollbar-thin">
            <div className="prose prose-invert max-w-none prose-headings:text-[#8b5cf6] prose-headings:font-bold prose-headings:mt-5 prose-headings:mb-2 prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:font-mono prose-code:text-[#10b981] font-normal">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}