'use client';

import React, { useState, useRef, useEffect } from 'react';
import { InlineVideoCard } from './InlineVideoCard';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import {
  Send,
  Sparkles,
  User,
  ImagePlus,
  X,
  RefreshCw,
  Edit2,
  CheckCheck,
  RotateCcw,
  Trash2,
  ArrowRight,
  Video,
  Database,
  Film,
  ArrowUp,
  Cpu,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

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
    const promptToSend = inputText.trim() || 'Animate and direct this image with cinematic camera motion and depth.';
    onSendMessage(promptToSend, selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    setImageFileName(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const promptSuggestions = [
    {
      title: 'Monochrome Noir Film',
      prompt: 'A cinematic monochrome noir teaser in the rain with ambient audio soundtrack.',
    },
    {
      title: '15-Second Product Promo',
      prompt: 'Create a 15-second product promo on seedance with modern pacing and high-contrast captions.',
    },
    {
      title: 'Cyberpunk Neon Nocturne',
      prompt: 'A futuristic city at night with glowing neon reflections on wet streets and atmospheric fog.',
    },
    {
      title: 'Animate Still Photo',
      prompt: 'Animate this still image with smooth dolly camera movement and depth of field.',
    },
  ];

  const hasRealMessages = messages.length > 0 && messages.some((m) => m.id !== 'msg-welcome');

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full w-full relative transition-all ${
        isDragging ? 'ring-2 ring-[var(--accent)] bg-[var(--surface-2)]/30' : ''
      }`}
    >
      {/* Top Project Sub-Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg)]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          {activeProject ? (
            isEditingTitle ? (
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
                  className="px-2 py-1 text-xs font-mono bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--fg)] rounded focus:outline-none"
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
                  className="text-sm sm:text-base font-medium text-[var(--fg)] tracking-tight cursor-pointer hover:text-[var(--accent)] transition flex items-center gap-1.5"
                  title="Click to rename project"
                >
                  <span>{activeProject.title}</span>
                  <Edit2 className="w-3 h-3 opacity-30 group-hover:opacity-100 transition" />
                </h2>

                {activeProject.versions?.length > 0 && (
                  <span className="text-[11px] font-mono text-[var(--fg-muted)] px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] ml-1">
                    {activeProject.versions.length} take{activeProject.versions.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )
          ) : (
            <h2 className="text-sm font-medium text-[var(--fg)]">New Video Project</h2>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Active Memories Count Badge */}
          {activeMemories.length > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--fg)]"
              title="Preferences automatically applied from persistent memory"
            >
              <Database className="w-3 h-3 text-emerald-500" />
              <span>{activeMemories.filter((m) => m.isActive).length} Memories Active</span>
            </div>
          )}

          {/* Engine Capability Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px] font-mono text-[var(--fg-muted)]">
            <Cpu className="w-3 h-3 text-[var(--accent)]" />
            <span className="hidden md:inline">Livepeer Engine</span>
            <span>seedance &middot; pixverse</span>
          </div>

          {activeProject && onResetProject && (
            <button
              onClick={() => onResetProject(activeProject.id)}
              className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
              title="Reset project takes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {activeProject && onDeleteProject && (
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

      {/* Main Conversation Stream Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6 pb-28">
          {/* Welcome Screen (only when conversation is empty) */}
          {!hasRealMessages && (
            <div className="text-center py-10 sm:py-16 space-y-6 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mx-auto shadow-sm">
                <Sparkles className="w-7 h-7 animate-pulse-subtle" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--fg)]">
                  What video would you like to direct?
                </h1>
                <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-light">
                  Direct Livepeer neural video models. Nue remembers your stylistic preferences across every take with zero reprompting.
                </p>
              </div>

              {/* ChatGPT-style Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto text-left pt-2">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(item.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3.5 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] border border-[var(--border)]/70 hover:border-[var(--accent)]/50 transition-all duration-200 text-left group hover:-translate-y-0.5 active:scale-[0.99] shadow-xs"
                  >
                    <div className="text-xs font-medium text-[var(--fg)] mb-1 flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--fg-faint)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Messages Stream */}
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';

            // Find matching version for agent turn if this message corresponds to a generated version
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
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-4 h-4 animate-pulse-subtle" />
                  </div>
                )}

                <div
                  className={`flex flex-col space-y-2 max-w-[92%] sm:max-w-[85%] ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* User Message Bubble */}
                  {isUser ? (
                    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-sm text-[var(--fg)] shadow-xs leading-relaxed">
                      {msg.imageUrl && (
                        <div className="mb-2.5 overflow-hidden rounded-xl border border-[var(--border)] max-w-[280px] bg-black/20">
                          <img
                            src={msg.imageUrl}
                            alt="Prompt visual reference"
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
                    /* Agent Message Bubble */
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm text-[var(--fg)] shadow-sm leading-relaxed w-full">
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                      {/* Render Inline Video Player inside the message card */}
                      {matchingVersion && (
                        <InlineVideoCard
                          version={matchingVersion}
                          isLatest={index === messages.length - 1}
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
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] shrink-0 mt-0.5 shadow-xs">
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

          {/* Directing / Generating Live Thinking State */}
          {isGenerating && (
            <div className="flex gap-3 sm:gap-4 animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-xs">
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

      {/* Floating Bottom Input Bar (ChatGPT Style Pill) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent z-20">
        <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-2">
          {/* Selected Picture Thumbnail Chip */}
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
                  title="Remove picture"
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

          {/* Input Pill Container */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-[var(--surface)] border border-[var(--border)]/80 shadow-lg focus-within:border-[var(--accent)] transition-all p-1.5 sm:p-2 flex items-end gap-2"
          >
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

            {/* Upload Picture Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="p-2 sm:p-2.5 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition shrink-0"
              title="Upload image to animate or direct"
            >
              <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Prompt Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                selectedImage
                  ? 'Describe how to animate this picture...'
                  : 'Direct the creative agent or request a revision...'
              }
              rows={1}
              disabled={isGenerating}
              className="flex-1 bg-transparent py-2 px-1 text-xs sm:text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none resize-none max-h-[180px] leading-relaxed"
            />

            {/* Round Up-Arrow Send Button (ChatGPT style) */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedImage) || isGenerating}
              className="p-2 sm:p-2.5 rounded-full bg-[var(--fg)] text-[var(--bg)] disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-200 shrink-0 shadow-sm active:scale-95 flex items-center justify-center"
              title="Send prompt"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </form>

          {/* Subtitle / Disclaimer */}
          <div className="text-center">
            <span className="text-[10px] font-mono text-[var(--fg-faint)]">
              Nue Motion autonomously directs Livepeer video models with decentralized Walrus MemWal memory.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
