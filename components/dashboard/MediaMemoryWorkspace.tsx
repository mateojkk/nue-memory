'use client';

import React, { useState, useRef, useEffect } from 'react';
import { InlineVideoCard } from './InlineVideoCard';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import {
  Plus,
  Brain,
  Flame,
  Mic,
  MicOff,
  AudioLines,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  Globe,
  Sparkles,
  User,
  X,
  RefreshCw,
  Edit2,
  CheckCheck,
  RotateCcw,
  Trash2,
  Check,
  MessageSquare,
  History,
  Search,
  Film,
  Clock,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
} from 'lucide-react';

interface MediaMemoryWorkspaceProps {
  activeProject: CreativeProject | null;
  activeVersion: MediaVersion | null;
  allVersions: MediaVersion[];
  onSelectVersion: (index: number) => void;
  isGenerating: boolean;
  generationStage?: 'thinking' | 'cooking' | null;
  generationElapsedSeconds?: number;
  serverProgress?: number;
  serverStageDescription?: string;
  serverModel?: string;
  serverExpectedSla?: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageUrl?: string) => void;
  onRegenerate: () => void;
  pendingPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
  onConfirmRemember: () => void;
  onDismissPending: () => void;
  isSavingMemory: boolean;
  onNewProject: (title?: string, prompt?: string) => void;
  onNewChat?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onRenameProject?: (projectId: string, newTitle: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onResetProject?: (projectId: string) => void;
  activeMemories: MediaPreference[];
  projects?: CreativeProject[];
  currentProjectIndex?: number;
  onSelectProject?: (index: number) => void;
  onRefreshProjects?: (preferredId?: string) => void;
  userEmail?: string;
}

export function MediaMemoryWorkspace({
  activeProject,
  activeVersion,
  allVersions,
  onSelectVersion,
  onRefreshProjects,
  userEmail,
  isGenerating,
  generationStage = 'thinking',
  generationElapsedSeconds = 0,
  serverProgress,
  serverStageDescription,
  serverModel,
  serverExpectedSla,
  messages,
  onSendMessage,
  onRegenerate,
  pendingPreferences,
  onConfirmRemember,
  onDismissPending,
  isSavingMemory,
  onNewProject,
  onNewChat,
  onDeleteMessage,
  onRenameProject,
  onDeleteProject,
  onResetProject,
  activeMemories,
  projects = [],
  currentProjectIndex = 0,
  onSelectProject,
}: MediaMemoryWorkspaceProps) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [activePlayingVersionNumber, setActivePlayingVersionNumber] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) return false;
      try {
        const saved = localStorage.getItem('nue_sidebar_collapsed');
        if (saved !== null) return saved !== 'true';
      } catch {
        // Fallback
      }
    }
    return true;
  });

  const handleSetShowHistory = (show: boolean) => {
    setShowHistory(show);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nue_sidebar_collapsed', String(!show));
      } catch {
        // Fallback
      }
    }
  };

  // Automatically collapse on viewport resize or mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowHistory(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHistory) {
        handleSetShowHistory(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHistory]);

  const [historySearch, setHistorySearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const centerFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const centerInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Adjust textarea height dynamically in chat mode
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Web Speech API for the mic button
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your prompt.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleStartRename = () => {
    if (!activeProject) return;
    setEditedTitle(activeProject.title);
    setIsEditingTitle(true);
  };

  const handleSaveRename = () => {
    if (activeProject && editedTitle.trim() && onRenameProject) {
      onRenameProject(activeProject.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            setSelectedImage(compressed);
            return;
          }
        }
        setSelectedImage(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isGenerating) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && showHistory) {
      handleSetShowHistory(false);
    }
    const promptToSend =
      inputText.trim() || 'Animate and direct this image with cinematic camera motion and depth.';
    onSendMessage(promptToSend, selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    setImageFileName(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Progress stages for video generation with Seedance SLA interpolation
  const getCookingProgress = (seconds: number, model?: string) => {
    // Seedance SLA: ~240s (~4 min)
    if (seconds < 8) {
      return {
        step: 1,
        total: 4,
        percent: Math.min(20, Math.max(10, Math.round((seconds / 8) * 20))),
        title: 'Directing creative brief & scenes',
        detail: 'Architecting multi-frame prompts and visual aesthetics',
      };
    }
    if (seconds < 210) {
      return {
        step: 2,
        total: 4,
        percent: 20 + Math.min(60, Math.round(((seconds - 8) / 202) * 60)),
        title: 'Rendering neural video takes',
        detail: 'Deep multi-frame temporal diffusion in flight on Livepeer GPUs (~4 min)',
      };
    }
    if (seconds < 230) {
      return {
        step: 3,
        total: 4,
        percent: 80 + Math.min(10, Math.round(((seconds - 210) / 20) * 10)),
        title: 'Composing & synchronizing AI soundtrack',
        detail: 'Synthesizing ambient audio track to match scene mood',
      };
    }
    return {
      step: 4,
      total: 4,
      percent: Math.min(96, 90 + Math.round(((seconds - 230) / 30) * 6)),
      title: 'Assembling multi-scene timeline',
      detail: 'Stitching takes and encoding seamless continuous MP4',
    };
  };

  const estimatedSla = serverExpectedSla || '~4 min';
  const baseProgress = getCookingProgress(generationElapsedSeconds, serverModel);

  // Compute smooth percentage: between 3-second server poll ticks, advance smoothly with elapsed seconds
  const currentPercent = serverProgress !== undefined
    ? Math.max(serverProgress, baseProgress.percent)
    : baseProgress.percent;

  const currentStep = currentPercent < 25 ? 1 : currentPercent < 80 ? 2 : currentPercent < 90 ? 3 : 4;

  const stageTitles: Record<number, string> = {
    1: 'Stage 1 of 4: Creative Direction & Scene Architecture',
    2: `Stage 2 of 4: Neural Video Diffusion on ${serverModel || 'seedance-25-t2v'}`,
    3: 'Stage 3 of 4: AI Soundtrack & Audio Synthesis',
    4: 'Stage 4 of 4: Video Assembly & Final Encoding',
  };

  const activeModelName = serverModel || 'seedance-25-t2v';

  const cookingProgress = {
    step: currentStep,
    total: 4,
    percent: Math.min(96, currentPercent),
    stageName: stageTitles[currentStep],
    title: serverStageDescription ? serverStageDescription : baseProgress.title,
    detail: serverStageDescription ? baseProgress.detail : baseProgress.detail,
    model: activeModelName,
    expectedSla: estimatedSla,
  };

  const filteredProjects = projects.filter((p) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.initialPrompt && p.initialPrompt.toLowerCase().includes(q)) ||
      (p.messages && p.messages.some((m) => m.content.toLowerCase().includes(q)))
    );
  });

  // Filter out any default placeholder welcome messages from display so real user messages stand out
  const realMessages = messages.filter(
    (m) =>
      m.id !== 'msg-welcome' &&
      !m.content.startsWith('Welcome to Creative Studio. I adapt to your style')
  );
  const hasRealMessages = realMessages.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-h-[calc(100vh-12rem)] w-full relative transition-all ${
        isDragging ? 'ring-2 ring-[var(--accent)] bg-[var(--surface-2)]/30' : ''
      }`}
    >
      {/* Workspace Top Header Bar: Project Switcher & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => handleSetShowHistory(!showHistory)}
              className="p-1.5 -ml-1 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
              title={showHistory ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={showHistory ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {showHistory ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
            <h2 className="text-xl sm:text-2xl font-medium text-[var(--fg)] tracking-tight font-sans">
              Nue Motion
            </h2>
            {activeProject && (
              <>
                <span className="text-[var(--fg-faint)] text-xs">&middot;</span>
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      autoFocus
                      className="px-2 py-0.5 text-xs font-mono bg-[var(--surface-2)] text-[var(--fg)] rounded transition"
                    />
                    <button
                      onClick={handleSaveRename}
                      className="p-1 rounded bg-[var(--accent-deep)] text-[#4a2c0e] hover:bg-[var(--accent)] transition"
                      title="Save Title"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--fg-muted)] transition"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <span
                      onClick={handleStartRename}
                      className="text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] px-2 py-0.5 rounded bg-[var(--surface-2)] cursor-pointer transition flex items-center gap-1.5"
                      title="Click to rename project"
                    >
                      <span>{activeProject.title}</span>
                      <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition" />
                    </span>

                    {onDeleteProject && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${activeProject.title}"?`)) {
                            onDeleteProject(activeProject.id);
                          }
                        }}
                        className="p-1.5 rounded text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-950/20 transition border-none"
                        title="Delete this project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-[var(--fg-muted)] font-light mt-0.5">
            AI video director that learns your creative style.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 max-w-full">
          <button
            onClick={() => (onNewChat ? onNewChat() : onNewProject())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] font-medium hover:scale-105 active:scale-95 transition shadow-xs"
            title="Start a new chat session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Memory Applied Banner */}
      {activeVersion && activeVersion.appliedPreferences.length > 0 && (
        <div className="my-3 p-3 rounded-xl bg-[var(--surface)] text-xs font-mono text-[var(--fg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>{activeVersion.appliedPreferences.length} learned preferences applied</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeVersion.appliedPreferences.map((pref) => (
                <span
                  key={pref.id}
                  className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--fg)] text-[11px]"
                >
                  ✓ {pref.preference}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-[var(--fg-muted)] shrink-0">
            Applied from persistent memory
          </span>
        </div>
      )}

      {/* Hidden file inputs for uploading pictures */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processImageFile(e.target.files[0]);
          }
        }}
      />
      <input
        ref={centerFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processImageFile(e.target.files[0]);
          }
        }}
      />

      <div className="flex-1 flex gap-5 w-full min-h-0 relative items-start">
        {/* Backdrop for mobile / tablet auto-collapse when clicking outside */}
        {showHistory && (
          <div
            onClick={() => handleSetShowHistory(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
            aria-hidden="true"
          />
        )}

        {/* Left: Chat History Sidebar - Responsive & Automatically Collapsible */}
        <aside
          className={`shrink-0 transition-all duration-300 ease-in-out flex flex-col gap-3 overflow-hidden ${
            showHistory
              ? 'fixed lg:sticky top-20 lg:top-24 left-4 lg:left-0 z-40 bg-[var(--surface)] lg:bg-transparent p-3.5 lg:p-0 rounded-2xl lg:rounded-none shadow-2xl lg:shadow-none w-72 opacity-100 mr-0 lg:mr-4 h-[calc(100vh-10rem)] lg:h-[calc(100vh-14rem)]'
              : 'w-0 opacity-0 mr-0 pointer-events-none sticky top-24 h-[calc(100vh-14rem)]'
          }`}
        >
          <div className="w-64 sm:w-72 flex flex-col gap-3 h-full pr-1">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--fg)] font-medium">
                <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Chat Sessions</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (onNewChat) onNewChat();
                    else onNewProject();
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      handleSetShowHistory(false);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] font-medium transition"
                  title="Start a new chat session"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
                <button
                  onClick={() => handleSetShowHistory(false)}
                  className="p-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] lg:hidden transition"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="relative shrink-0">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Filter sessions..."
                className="w-full pl-8 pr-2 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--surface)] text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:outline-none focus:bg-[var(--surface-2)] border-none"
              />
            </div>

            {/* Scrollable list of chat sessions */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 no-scrollbar">
              {filteredProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--fg-muted)] font-light">
                  No chat sessions found
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const actualIdx = projects.findIndex((p) => p.id === proj.id);
                  const isSelected = currentProjectIndex === actualIdx;
                  const videoCount = proj.versions?.length || 0;
                  const lastMsg =
                    proj.messages && proj.messages.length > 0
                      ? proj.messages[proj.messages.length - 1].content
                      : proj.initialPrompt || 'New chat session';

                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject?.(actualIdx);
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          handleSetShowHistory(false);
                        }
                      }}
                      className={`group/session w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer flex flex-col gap-1 relative ${
                        isSelected
                          ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium shadow-xs'
                          : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate text-xs font-medium text-[var(--fg)]">
                          {proj.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {videoCount > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center gap-0.5">
                              <Film className="w-2.5 h-2.5" />
                              <span>{videoCount}</span>
                            </span>
                          )}
                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `Delete "${proj.title}"? All chat messages and generated videos in this session will be removed.`
                                  )
                                ) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              className="opacity-0 group-hover/session:opacity-100 p-0.5 rounded text-[var(--fg-muted)] hover:text-red-400 hover:bg-[var(--surface-3)] transition-opacity"
                              title="Delete chat session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--fg-muted)] font-light truncate leading-normal">
                        {lastMsg}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>


        {/* Right: Main Chat Stage */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* CASE 1: EMPTY STATE - EXACT CHATGPT SCREEN */}
          {!hasRealMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-20 px-4 animate-fadeIn">
          <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--fg)] text-center">
              What&apos;s on the agenda today?
            </h1>

            {/* Picture attachment chip above center input */}
            {selectedImage && (
              <div className="p-2 rounded-2xl bg-[var(--surface)] flex items-center gap-3 shadow-md animate-fadeIn">
                <div className="relative rounded-xl overflow-hidden w-12 h-12 bg-black/40 shrink-0">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImageFileName(null);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[var(--fg)] truncate">
                    {imageFileName || 'Image attached'}
                  </div>
                  <div className="text-[10px] text-[var(--fg-muted)] font-mono">
                    Ready for neural video animation
                  </div>
                </div>
              </div>
            )}

            {/* Center Input Box */}
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-2xl bg-[var(--surface)] shadow-md hover:shadow-lg focus-within:shadow-xl transition-all px-4 py-3 flex items-center gap-3 border-none"
            >
              <button
                type="button"
                onClick={() => centerFileInputRef.current?.click()}
                className="w-8 h-8 rounded-xl hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center justify-center transition shrink-0"
                title="Attach picture"
              >
                <Plus className="w-5 h-5 stroke-[2]" />
              </button>

              <input
                ref={centerInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask anything"
                className="flex-1 bg-transparent text-sm sm:text-base text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none"
                autoFocus
              />

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-1.5 rounded-full transition shrink-0 ${
                  isListening
                    ? 'text-red-500 bg-red-500/10 animate-pulse'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                title={isListening ? 'Listening...' : 'Voice prompt'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedImage) || isGenerating}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shrink-0 active:scale-95 shadow-xs ${
                  inputText.trim() || selectedImage
                    ? 'bg-[var(--fg)] text-[var(--bg)] cursor-pointer'
                    : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                }`}
                title={inputText.trim() || selectedImage ? 'Send' : 'Voice mode'}
              >
                {inputText.trim() || selectedImage ? (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <AudioLines className="w-4 h-4" />
                )}
              </button>
            </form>

            {/* Suggestions List (exact ChatGPT layout) */}
            <div className="space-y-1 pt-1 max-w-lg mx-auto sm:mx-0">
              <button
                type="button"
                onClick={() => {
                  setInputText('Create a 15-second cinematic cyberpunk scene on seedance with ambient audio');
                  centerInputRef.current?.focus();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[var(--surface-2)]/60 text-xs sm:text-sm text-[var(--fg-soft)] hover:text-[var(--fg)] transition text-left group"
              >
                <ImageIcon className="w-4 h-4 text-[var(--fg-faint)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                <span>Create an image or sticker</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputText('Direct a monochrome noir teaser with ambient audio soundtrack and high-contrast visuals');
                  centerInputRef.current?.focus();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[var(--surface-2)]/60 text-xs sm:text-sm text-[var(--fg-soft)] hover:text-[var(--fg)] transition text-left group"
              >
                <Pencil className="w-4 h-4 text-[var(--fg-faint)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                <span>Write or edit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputText('Recall my remembered style preferences and direct a modern product promo take');
                  centerInputRef.current?.focus();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[var(--surface-2)]/60 text-xs sm:text-sm text-[var(--fg-soft)] hover:text-[var(--fg)] transition text-left group"
              >
                <Globe className="w-4 h-4 text-[var(--fg-faint)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                <span>Search the web</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: ACTIVE CONVERSATION - CHATGPT STREAM WITH INLINE VIDEOS */
        <div className="flex-1 flex flex-col pt-4 space-y-6">
          <div className="flex-1 space-y-6 pb-28">
            {realMessages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const matchingVersion =
                msg.versionNumber !== undefined
                  ? allVersions.find((v) => v.versionNumber === msg.versionNumber)
                  : null;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 sm:gap-4 animate-fadeIn ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col space-y-2 max-w-[92%] sm:max-w-[85%] ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User Bubble */}
                    {isUser ? (
                      <div className="group/msg relative bg-[var(--surface-2)] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-sm text-[var(--fg)] shadow-xs leading-relaxed">
                        {msg.imageUrl && (
                          <div className="mb-2.5 overflow-hidden rounded-xl max-w-[280px] bg-black/20">
                            <img
                              src={msg.imageUrl}
                              alt="Visual reference"
                              className="w-full h-auto max-h-[200px] object-cover"
                            />
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="mt-1.5 text-[10px] font-mono text-[var(--fg-muted)] flex items-center justify-end gap-2">
                          {onDeleteMessage && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 p-0.5 rounded text-[var(--fg-muted)] hover:text-red-400 hover:bg-[var(--surface-3)] transition-opacity border-none"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Agent Bubble with Inline Video */
                      <div className="group/msg relative bg-[var(--surface)] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm text-[var(--fg)] shadow-sm leading-relaxed w-full">
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        {matchingVersion && (
                          <InlineVideoCard
                            version={matchingVersion}
                            isLatest={index === realMessages.length - 1}
                            projectId={activeProject?.id}
                            userEmail={userEmail}
                            onRefreshProjects={onRefreshProjects}
                            isGloballyPlaying={activePlayingVersionNumber === matchingVersion.versionNumber}
                            onGlobalPlay={() => setActivePlayingVersionNumber(matchingVersion.versionNumber)}
                            onGlobalPause={() => {
                              setActivePlayingVersionNumber((prev) =>
                                prev === matchingVersion.versionNumber ? null : prev
                              );
                            }}
                          />
                        )}

                        <div className="mt-2 text-[10px] font-mono text-[var(--fg-muted)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Creative Agent</span>
                            {onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => onDeleteMessage(msg.id)}
                                className="opacity-0 group-hover/msg:opacity-100 p-0.5 rounded text-[var(--fg-muted)] hover:text-red-400 hover:bg-[var(--surface-2)] transition-opacity border-none"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--fg-muted)] shrink-0 mt-0.5 shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending Memory Confirmation Trigger */}
            {pendingPreferences.length > 0 && (
              <div className="pl-11 pr-2 animate-fadeIn">
                <MemoryConfirmation
                  detectedPreferences={pendingPreferences}
                  onConfirmRemember={onConfirmRemember}
                  onDismiss={onDismissPending}
                  isSaving={isSavingMemory}
                />
              </div>
            )}

            {/* Directing Shimmer State with Real-time Progress */}
            {isGenerating && (
              <div className="flex gap-3 sm:gap-4 items-start animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs mt-0.5">
                  {generationStage === 'cooking' ? (
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : (
                    <Brain className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                  )}
                </div>

                {generationStage === 'cooking' ? (
                  <div className="w-full max-w-md bg-[var(--surface)] p-4 rounded-2xl rounded-tl-xs shadow-md space-y-2.5 text-left border-none">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-amber-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>{cookingProgress.stageName}</span>
                      </div>
                      <span className="text-[var(--fg-muted)] font-mono text-[11px]">
                        {generationElapsedSeconds}s elapsed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-[var(--accent)] to-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${cookingProgress.percent}%` }}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium text-[var(--fg)]">
                        <span className="truncate pr-2">{cookingProgress.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] font-mono shrink-0">
                          {cookingProgress.model} ({cookingProgress.expectedSla})
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)] font-light leading-relaxed">
                        {cookingProgress.step === 2 && cookingProgress.model.includes('seedance')
                          ? 'Seedance 2.5 deep multi-frame temporal diffusion in flight on Livepeer GPUs (~3-4 min).'
                          : cookingProgress.step === 2
                          ? 'Diffusion inference actively running on Livepeer GPU nodes (~45s take).'
                          : cookingProgress.detail}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--surface)] rounded-2xl rounded-tl-xs px-4 py-2 text-xs font-mono text-[var(--fg-muted)] flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                    <span className="font-semibold lowercase text-[var(--accent)]">
                      thinking...
                    </span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Bottom Input Bar */}
          <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent z-20">
            <div className="max-w-3xl mx-auto w-full space-y-2">
              {selectedImage && (
                <div className="p-2 rounded-xl bg-[var(--surface)] flex items-center gap-2.5 max-w-sm animate-fadeIn shadow-md">
                  <div className="relative rounded-lg overflow-hidden w-11 h-11 bg-black/40 shrink-0">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImageFileName(null);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[var(--fg)] truncate">
                      {imageFileName || 'Image attached'}
                    </div>
                    <div className="text-[10px] text-[var(--fg-muted)] font-mono">
                      Ready for image-to-video animation
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Input Box */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl bg-[var(--surface)] shadow-md hover:shadow-lg focus-within:shadow-xl transition-all px-4 py-2.5 flex items-center gap-3 border-none"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="w-8 h-8 rounded-xl hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center justify-center transition shrink-0"
                  title="Attach image"
                >
                  <Plus className="w-5 h-5 stroke-[2]" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    isGenerating
                      ? generationStage === 'cooking'
                        ? 'cooking...'
                        : 'thinking...'
                      : 'Ask anything or direct revision...'
                  }
                  rows={1}
                  disabled={isGenerating}
                  className="flex-1 bg-transparent py-1 text-xs sm:text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none resize-none max-h-[180px] leading-relaxed"
                />

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-1.5 rounded-full transition shrink-0 ${
                    isListening
                      ? 'text-red-500 bg-red-500/10 animate-pulse'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                  title={isListening ? 'Listening...' : 'Voice prompt'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedImage) || isGenerating}
                  className="w-8 h-8 rounded-full bg-[var(--fg)] text-[var(--bg)] disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 transition-all shrink-0 active:scale-95 flex items-center justify-center"
                  title={isGenerating ? (generationStage === 'cooking' ? 'cooking...' : 'thinking...') : 'Send'}
                >
                  {isGenerating ? (
                    generationStage === 'cooking' ? (
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                    ) : (
                      <Brain className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                    )
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </form>

              <div className="text-center">
                <span className="text-[10px] font-mono text-[var(--fg-faint)]">
                  Nue Motion remembers and applies your creative taste as you collaborate.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
