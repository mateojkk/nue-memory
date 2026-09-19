'use client';

import React, { useState, useRef, useEffect } from 'react';
import { InlineVideoCard } from './InlineVideoCard';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import {
  Plus,
  Brain,
  Mic,
  MicOff,
  AudioLines,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  Globe,
  Sparkles,
  User,
  ImagePlus,
  X,
  RefreshCw,
  Edit2,
  CheckCheck,
  RotateCcw,
  Trash2,
  Cpu,
  Database,
} from 'lucide-react';

interface MediaMemoryWorkspaceProps {
  activeProject: CreativeProject | null;
  activeVersion: MediaVersion | null;
  allVersions: MediaVersion[];
  onSelectVersion: (index: number) => void;
  isGenerating: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageUrl?: string) => void;
  onRegenerate: () => void;
  pendingPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
  onConfirmRemember: () => void;
  onDismissPending: () => void;
  isSavingMemory: boolean;
  onNewProject: (title?: string, prompt?: string) => void;
  onRenameProject?: (projectId: string, newTitle: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onResetProject?: (projectId: string) => void;
  activeMemories: MediaPreference[];
  projects?: CreativeProject[];
  currentProjectIndex?: number;
  onSelectProject?: (index: number) => void;
}

export function MediaMemoryWorkspace({
  activeProject,
  activeVersion,
  allVersions,
  onSelectVersion,
  isGenerating,
  messages,
  onSendMessage,
  onRegenerate,
  pendingPreferences,
  onConfirmRemember,
  onDismissPending,
  isSavingMemory,
  onNewProject,
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
      className={`flex flex-col h-full w-full relative bg-[var(--bg)] transition-all select-none ${
        isDragging ? 'ring-2 ring-[var(--accent)] bg-[var(--surface-2)]/30' : ''
      }`}
    >
      {/* Top Project Bar (shown when active project exists or renaming) */}
      {activeProject && hasRealMessages && (
        <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg)]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
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
                  className="px-2 py-0.5 text-xs font-mono bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--fg)] rounded focus:outline-none"
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
              <div className="flex items-center gap-1.5 group">
                <h2
                  onClick={handleStartRename}
                  className="text-sm font-medium text-[var(--fg)] tracking-tight cursor-pointer hover:text-[var(--accent)] transition flex items-center gap-1.5"
                  title="Click to rename"
                >
                  <span>{activeProject.title}</span>
                  <Edit2 className="w-3 h-3 opacity-30 group-hover:opacity-100 transition" />
                </h2>

                {activeProject.versions?.length > 0 && (
                  <span className="text-[10px] font-mono text-[var(--fg-muted)] px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] ml-1">
                    {activeProject.versions.length} take{activeProject.versions.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeMemories.length > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--fg)]"
                title="Preferences automatically applied from persistent memory"
              >
                <Database className="w-3 h-3 text-emerald-500" />
                <span>{activeMemories.filter((m) => m.isActive).length} Memories</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px] font-mono text-[var(--fg-muted)]">
              <Cpu className="w-3 h-3 text-[var(--accent)]" />
              <span>seedance &middot; pixverse</span>
            </div>

            {onResetProject && (
              <button
                onClick={() => onResetProject(activeProject.id)}
                className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
                title="Reset takes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {onDeleteProject && (
              <button
                onClick={() => onDeleteProject(activeProject.id)}
                className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-950/20 transition"
                title="Delete project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for uploading pictures */}
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

      {/* CASE 1: EMPTY STATE - EXACT CHATGPT HOME SCREEN */}
      {!hasRealMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 -mt-10 animate-fadeIn">
          <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
            {/* ChatGPT Headline */}
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--fg)] text-center">
              What&apos;s on the agenda today?
            </h1>

            {/* Picture attachment chip above center input */}
            {selectedImage && (
              <div className="p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3 shadow-md animate-fadeIn">
                <div className="relative rounded-xl overflow-hidden border border-[var(--border)] w-12 h-12 bg-black/40 shrink-0">
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

            {/* ChatGPT Center Input Pill */}
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md hover:shadow-lg focus-within:shadow-xl focus-within:border-[var(--accent)] transition-all px-4 py-3 flex items-center gap-3"
            >
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => centerFileInputRef.current?.click()}
                className="w-8 h-8 rounded-full hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center justify-center transition shrink-0"
                title="Attach picture"
              >
                <Plus className="w-5 h-5 stroke-[2]" />
              </button>

              {/* Input Field */}
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

              {/* Think (MemWal Memory) Toggle Pill */}
              <button
                type="button"
                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition shrink-0 ${
                  isThinkingEnabled
                    ? 'bg-[var(--surface-2)] text-[var(--fg)] border border-[var(--border)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                title="Persistent MemWal memory direction"
              >
                <Brain className={`w-3.5 h-3.5 ${isThinkingEnabled ? 'text-[var(--accent)]' : ''}`} />
                <span>Think</span>
              </button>

              {/* Mic Voice Button */}
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

              {/* Round Action Button (Green soundwaves icon when empty, Up arrow when typed) */}
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

            {/* Suggestions list directly underneath the pill (exactly like ChatGPT) */}
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6 pb-28">
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
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5 shadow-xs">
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
                      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-sm text-[var(--fg)] shadow-xs leading-relaxed">
                        {msg.imageUrl && (
                          <div className="mb-2.5 overflow-hidden rounded-xl border border-[var(--border)] max-w-[280px] bg-black/20">
                            <img
                              src={msg.imageUrl}
                              alt="Visual reference"
                              className="w-full h-auto max-h-[200px] object-cover"
                            />
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="mt-1 text-[10px] font-mono text-[var(--fg-muted)] text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Agent Bubble with Inline Video */
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm text-[var(--fg)] shadow-sm leading-relaxed w-full">
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        {matchingVersion && (
                          <InlineVideoCard
                            version={matchingVersion}
                            isLatest={index === realMessages.length - 1}
                          />
                        )}

                        <div className="mt-2 text-[10px] font-mono text-[var(--fg-muted)] flex items-center justify-between">
                          <span>Creative Agent</span>
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
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] shrink-0 mt-0.5 shadow-xs">
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

            {/* Generating Shimmer */}
            {isGenerating && (
              <div className="flex gap-3 sm:gap-4 animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-xs p-4 text-xs font-mono text-[var(--fg-muted)] space-y-2 max-w-lg shadow-sm">
                  <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                    <span>Directing Livepeer neural video model...</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--fg-soft)]">
                    Synthesizing takes, composing soundtrack with affirmative audio conditioning, and recalling learned preferences from Walrus MemWal.
                  </p>
                  <div className="w-full h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Floating Bottom Input Bar in Conversation Mode */}
      {hasRealMessages && (
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent z-20">
          <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-2">
            {selectedImage && (
              <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2.5 max-w-sm animate-fadeIn shadow-md">
                <div className="relative rounded-lg overflow-hidden border border-[var(--border)] w-11 h-11 bg-black/40 shrink-0">
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

            {/* Bottom Pill */}
            <form
              onSubmit={handleSubmit}
              className="rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md hover:shadow-lg focus-within:shadow-xl focus-within:border-[var(--accent)] transition-all px-4 py-2.5 flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="w-8 h-8 rounded-full hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center justify-center transition shrink-0"
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
                placeholder="Ask anything or direct revision..."
                rows={1}
                disabled={isGenerating}
                className="flex-1 bg-transparent py-1 text-xs sm:text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none resize-none max-h-[180px] leading-relaxed"
              />

              <button
                type="button"
                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition shrink-0 ${
                  isThinkingEnabled
                    ? 'bg-[var(--surface-2)] text-[var(--fg)] border border-[var(--border)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                title="MemWal memory"
              >
                <Brain className={`w-3.5 h-3.5 ${isThinkingEnabled ? 'text-[var(--accent)]' : ''}`} />
                <span className="hidden sm:inline">Think</span>
              </button>

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
                title="Send"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            <div className="text-center">
              <span className="text-[10px] font-mono text-[var(--fg-faint)]">
                Nue Motion directs Livepeer neural video models with Walrus MemWal memory.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
