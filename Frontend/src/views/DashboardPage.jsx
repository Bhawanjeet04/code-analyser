import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { IoCloudUploadOutline } from "react-icons/io5";
import { FiPlus } from "react-icons/fi";
import { FiLogOut } from "react-icons/fi";
import { FaRegFileCode } from "react-icons/fa";
import { FaCode } from "react-icons/fa6";
import { FaUserCircle } from "react-icons/fa";

const BOILERPLATE_MAP = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++" << endl;\n    return 0;\n}',
  python: 'print("Hello from Python")',
  javascript: 'console.log("Hello from JavaScript");',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java");\n    }\n}'
};

export default function DashboardPage({ userSession, onLogout }) {
  const { roomId } = useParams(); 
  const navigate = useNavigate();

  // Active States
  const [activeTab, setActiveTab] = useState('editor'); 
  const [language, setLanguage] = useState('cpp');
  const [editorCode, setEditorCode] = useState(BOILERPLATE_MAP.cpp);
  const [fileCode, setFileCode] = useState('// Your uploaded local file stream context read-only...');
  const [fileName, setFileName] = useState('main.cpp');
  const [openTabs, setOpenTabs] = useState([]); // Tracks currently open files in tab bar
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Active Refs
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const dropdownRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const activeDockIcon = 'Files';

  // Outside click listener handler for profile context menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchWorkspaceDirectory = async (shouldLoadFirst = false) => {
    if (!userSession) return;
    try {
      const res = await fetch(`${API_BASE}/api/code/files?userId=${userSession}&roomId=${roomId || ''}`);
      const data = await res.json();
      if (res.ok && data.files) {
        setFileList(data.files);
        
        if (data.files.length > 0 && (shouldLoadFirst || !editorRef.current)) {
          const targetFile = data.files.find(f => f.fileName === fileName) || data.files[0];
          setFileName(targetFile.fileName);
          setLanguage(targetFile.language);
          setEditorCode(targetFile.codeContent);
          
          // Seed initial open tabs with the default active file
          setOpenTabs([targetFile]);

          if (editorRef.current) {
            editorRef.current.setValue(targetFile.codeContent);
          }
        }
        setIsHydrated(true); 
      }
    } catch (err) {
      console.error("Directory tree pull exception:", err);
      setIsHydrated(true); 
    }
  };

  useEffect(() => {
    setIsHydrated(false);
    fetchWorkspaceDirectory(true);

    return () => {
      cleanUpCollaboration();
    };
  }, [roomId, userSession]);

  // Background Auto-Save Debouncer Loop
  useEffect(() => {
    if (activeTab === 'upload' || !isHydrated || !fileName) return; 
    
    const delayDebounceTimer = setTimeout(() => {
      triggerBackgroundWorkspaceSave();
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
    if (!roomId || !fileName) return;
    initializeYjsSync(editor, fileName, language);
  };

  const initializeYjsSync = (editor, currentName, currentLang) => {
    cleanUpCollaboration();
    const ydoc = new Y.Doc();
    const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    
    const uniqueChannelName = `${roomId}-${currentName}`;
    const provider = new WebsocketProvider(WS_BASE, uniqueChannelName, ydoc);
    providerRef.current = provider;

    const ytext = ydoc.getText('monaco');
    
    provider.on('sync', (isSynced) => {
      if (isSynced && ytext.toString() === '') {
        const currentLocalValue = editor.getValue();
        if (currentLocalValue && currentLocalValue !== BOILERPLATE_MAP[currentLang]) {
          ytext.insert(0, currentLocalValue);
        }
      }
    });

    const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    bindingRef.current = binding;
  };

  const handleSelectFileNode = (fileRecord) => {
    // Cache the active tab's modifications locally before changing files
    if (editorRef.current && fileName) {
      const currentCode = editorRef.current.getValue();
      setFileList(prev => prev.map(f => f.fileName === fileName ? { ...f, codeContent: currentCode } : f));
    }

    // Add file to tabs pool if it's not already open
    setOpenTabs(prev => {
      if (prev.some(t => t.fileName === fileRecord.fileName)) return prev;
      return [...prev, fileRecord];
    });

    setFileName(fileRecord.fileName);
    setLanguage(fileRecord.language);
    setEditorCode(fileRecord.codeContent);
    if (editorRef.current) {
      editorRef.current.setValue(fileRecord.codeContent);
    }

    // Re-initialize dynamic session synchronization details for the new file channel
    if (roomId && editorRef.current) {
      initializeYjsSync(editorRef.current, fileRecord.fileName, fileRecord.language);
    }
  };

  const handleCloseTab = (e, tabToClose) => {
    e.stopPropagation(); // Avoid triggering file selection mechanics on the closed tab
    
    const tabIndex = openTabs.findIndex(t => t.fileName === tabToClose.fileName);
    const updatedTabs = openTabs.filter(t => t.fileName !== tabToClose.fileName);
    setOpenTabs(updatedTabs);

    // If we closed the file we are currently looking at, switch focus automatically
    if (fileName === tabToClose.fileName) {
      if (updatedTabs.length > 0) {
        const nextActiveTab = updatedTabs[tabIndex - 1] || updatedTabs[0];
        
        // Find latest local buffer content
        const matchedFile = fileList.find(f => f.fileName === nextActiveTab.fileName);
        const targetCode = matchedFile ? matchedFile.codeContent : nextActiveTab.codeContent;

        setFileName(nextActiveTab.fileName);
        setLanguage(nextActiveTab.language);
        setEditorCode(targetCode);
        
        if (editorRef.current) {
          editorRef.current.setValue(targetCode);
        }
        if (roomId && editorRef.current) {
          initializeYjsSync(editorRef.current, nextActiveTab.fileName, nextActiveTab.language);
        }
      } else {
        // Clear workspace view state entirely if zero tabs are open
        setFileName('');
        setLanguage('');
        setEditorCode('');
        if (editorRef.current) {
          editorRef.current.setValue('');
        }
        cleanUpCollaboration();
      }
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

    const newFileObj = { fileName: name, language: derivedLang, codeContent: BOILERPLATE_MAP[derivedLang] };
    
    setOpenTabs(prev => [...prev, newFileObj]);
    setFileName(name);
    setLanguage(derivedLang);
    setEditorCode(BOILERPLATE_MAP[derivedLang]);
    
    if (editorRef.current) {
      editorRef.current.setValue(BOILERPLATE_MAP[derivedLang]);
    }
    setNewFileName('');
    setShowNewFileModal(false);

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
      console.error("Failed to create file asset on remote workspace", err);
    }
  };

  const triggerBackgroundWorkspaceSave = async () => {
    if (!userSession || !isHydrated || !fileName) return; 

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
        fetchWorkspaceDirectory(false); 
      }
    } catch (err) {
      console.error("Workspace synchronization dropped offline", err);
    }
  };

  const handleInitializeCollaboration = async () => {
    const uniqueRoomId = `room-${Math.random().toString(36).substring(2, 11)}`;
    const currentCode = editorRef.current ? editorRef.current.getValue() : editorCode;
    
    try {
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
    if (!fileName) return;
    setIsExecuting(true);
    setOutput('> Executing Code...');
    
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
        setOutput(` Error executing the code:\n${data.error || 'Execution failure.'}`);
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

  const handleTriggerAiAnalysis = async () => {
    if (!fileName) return;
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
    
    let newName = 'main.cpp';
    if (lang === 'cpp') newName = 'main.cpp';
    else if (lang === 'python') newName = 'main.py';
    else if (lang === 'javascript') newName = 'main.js';
    else if (lang === 'java') newName = 'Main.java';
    
    setFileName(newName);
    setOpenTabs(prev => prev.map(t => t.fileName === fileName ? { ...t, fileName: newName, language: lang } : t));
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-[#C9D1D9] bg-[#09090e] font-sans antialiased select-none flex flex-col relative">
      
      {/* TOP BAR HEADER SECTION */}
      <header className="h-14 border-b border-[#1b1b24] bg-[#0c0c14] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <FaCode className="text-xl text-[#8B5CF6]" />
            <span className="text-sm font-bold tracking-tight text-white font-sohne">
              CodeLab
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!roomId ? (
            <button
              onClick={handleInitializeCollaboration}
              disabled={!fileName}
              className="h-9 bg-gradient-to-r from-[#6366f1] to-[#7c3aed] hover:opacity-90 text-white text-xs font-bold px-4 rounded-lg transition-all shadow-md cursor-pointer tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
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
              Copy Room Link
            </button>
          )}

          <div className="h-4 w-[1px] bg-[#1f1f2e] mx-1" />
          
          {/* USER PROFILE DROPDOWN ATTACHMENT */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="User Account Menu"
              className="h-10 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-200 cursor-pointer focus:outline-none"
            >
              <FaUserCircle size={22} />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#12111f] border border-[#1b1b2c] p-1 shadow-2xl z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-[#1b1b2c] text-left">
                  {/* <p className="text-[10px] font-bold text-slate-500 tracking-wider">Signed in as</p> */}
                  <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{userSession || 'Active User'}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full h-9 mt-1 flex items-center gap-2 px-3 text-left text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors duration-150 cursor-pointer"
                >
                  <FiLogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT BOX AREA */}
      <div className="flex-1 flex overflow-hidden relative">
      
      {activeDockIcon === 'Files' && (
        isSidebarCollapsed ? (
          /* COLLAPSED STATE - Expands automatically when mouse hovers over it */
          <aside 
            onMouseEnter={() => setIsSidebarCollapsed(false)}
            className="w-14 border-r border-[#1b1b24] bg-[#0c0c14] flex flex-col items-center py-4 shrink-0 transition-all duration-300 ease-in-out cursor-pointer"
            title="Hover to expand explorer"
          >
            <div className="w-10 h-10 flex items-center justify-center text-purple-400 bg-[#181821] border border-[#2c2c3d] rounded-xl shadow-md">
              <FaRegFileCode className="text-xl" />
            </div>
          </aside>
        ) : (
          /* EXPANDED STATE - Collapses automatically when mouse leaves the panel area */
          <aside 
            onMouseLeave={() => setIsSidebarCollapsed(true)}
            className="w-56 border-r border-[#1b1b24] bg-[#0c0c14] flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none"
          >
            

            <div className="p-4 pb-2 flex items-center justify-between">
              <span className="text-md font-bold text-slate-500 ">Files</span>
              <div className="flex overflow-hidden rounded-xl border border-[#2c2c3d] bg-[#181821]">
                <button
                  onClick={() => setShowNewFileModal(true)}
                  className="w-8 h-8 flex items-center justify-center text-purple-400 hover:bg-[#242432] transition-colors border-r border-[#2c2c3d] cursor-pointer"
                  title="New File"
                >
                  <FiPlus className="text-base" />
                </button>

                <label
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-[#242432] transition-colors cursor-pointer"
                  title="Upload File"
                >
                  <IoCloudUploadOutline className="text-base" />
                  <input
                    type="file"
                    onChange={handleLocalFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {fileList.length === 0 ? (
                <div className="text-[11px] text-slate-600 p-2 italic">Workspace empty.</div>
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
                    <span className="truncate">{file.fileName}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )
      )}

        <main className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-hidden bg-[#06060a]">
          <section className="flex-1 rounded-2xl border border-[#1b1b24] bg-[#0c0c12] overflow-hidden flex flex-col relative shadow-xl">
            
            {/* MULTI-TAB CONTROLLER BAR */}
            <div className="h-10 bg-[#1f1f1f] border-b border-[#1b1b24] flex items-end px-2 gap-1 shrink-0 overflow-x-auto scrollbar-none">
              {openTabs.map((tab) => (
                <div
                  key={tab.fileName}
                  onClick={() => {
                    if (fileName === tab.fileName) return;
                    // Cache outgoing edits
                    if (editorRef.current) {
                      const currentCode = editorRef.current.getValue();
                      setFileList(prev => prev.map(f => f.fileName === fileName ? { ...f, codeContent: currentCode } : f));
                    }
                    
                    setFileName(tab.fileName);
                    setLanguage(tab.language);
                    
                    const matchedFile = fileList.find(f => f.fileName === tab.fileName);
                    const targetCode = matchedFile ? matchedFile.codeContent : tab.codeContent;
                    setEditorCode(targetCode);
                    
                    if (editorRef.current) {
                      editorRef.current.setValue(targetCode);
                    }
                    if (roomId && editorRef.current) {
                      initializeYjsSync(editorRef.current, tab.fileName, tab.language);
                    }
                  }}
                  className={`flex items-center gap-3 h-8 px-3 rounded-xl mb-1 text-xs font-medium transition-all duration-150 border-t border-x cursor-pointer ${
                    fileName === tab.fileName
                      ? 'bg-[#0c0c12] border-[#1b1b24] text-white font-semibold'
                      : 'bg-[#0d0d14]/40 border-transparent text-slate-500 hover:bg-[#161622]/60 hover:text-slate-300'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{tab.fileName}</span>
                  {roomId && fileName === tab.fileName && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                  <button
                    onClick={(e) => handleCloseTab(e, tab)}
                    className="flex h-4 w-4 items-center justify-center rounded text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {openTabs.length === 0 && (
                <span className="text-[11px] text-slate-600 italic px-2 mb-2">No active tabs open</span>
              )}
            </div>

            {/* EDITOR CANVAS WINDOW */}
            <div className="flex-1 min-h-0 relative bg-[#0c0c12]">
              {fileName ? (
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
                    padding: { top: 10 },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    lineHeight: 21,
                    readOnly: activeTab === 'upload',
                    backgroundColor: '#0c0c12',
                  }}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-600 bg-[#0c0c12]">
                  <FaCode className="text-3xl opacity-20" />
                  <p className="text-xs italic">Select a file from the explorer pane to start coding</p>
                </div>
              )}

              {fileName && (
                <div className="flex gap-2 absolute bottom-6 right-6 z-10">
                  <button
                    onClick={handleTriggerAiAnalysis}
                    disabled={isAnalyzing}
                    className={`h-10 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                      isAnalyzing
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                        : "bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:scale-105 border border-[#8b5cf6]/40 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    }`}
                  >
                    {isAnalyzing ? "Auditing..." : "Analyze with AI"}
                  </button>
                  <button
                    onClick={handleRunCompiler}
                    disabled={isExecuting}
                    className={`h-11 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                      isExecuting 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                        : 'bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:scale-105 border border-[#8b5cf6]/40 shadow-indigo-500/20'
                    }`}
                  >
                    {isExecuting ? "Executing..." : "Run Code"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* INPUT/OUTPUT TERMINAL SPLIT PANEL */}
          <section className="w-full lg:w-[420px] flex flex-col gap-3 shrink-0 h-full overflow-hidden">
            <div className="flex-1 bg-[#0c0c12] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-lg min-h-[140px]">
              <div className="flex items-center gap-2 mb-2 select-none shrink-0">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Input</h4>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                disabled={!fileName}
                className="flex-1 w-full bg-[#07070b] text-slate-300 border border-[#1b1b24] rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-[#312e4f] transition-all resize-none shadow-inner leading-relaxed placeholder:text-slate-600 disabled:opacity-40"
                placeholder={fileName ? "Enter program input..." : "No active program environment loaded"}
              />
            </div>

            <div className="flex-[1.6] bg-[#07070b] rounded-2xl border border-[#1b1b24] p-4 flex flex-col shadow-2xl overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-[#1b1b24] pb-2 mb-2.5 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Output</h4>
                </div>
                <button
                  onClick={() => setOutput('')}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wide px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Clear Output
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-500 leading-relaxed p-3 bg-black/30 rounded-xl border border-white/[0.01] select-text scrollbar-thin">
                {output}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* NEW FILE MODAL WINDOW */}
      {showNewFileModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#12111f] border border-[#1b1b2c] p-6 rounded-xl w-full max-w-sm text-white shadow-2xl mx-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">Create New File</h3>
            <p className="text-slate-500 text-[11px] mb-4">Include file extension tags (e.g. .cpp, .py, .js, .java).</p>
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

      {/* AI ASSESSMENT DRAWER PANEL */}
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