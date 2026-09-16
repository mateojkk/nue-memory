'use client';

import React, { useState } from 'react';
import { MediaPreview } from '@/components/MediaPreview';
import { AgentChat } from '@/components/AgentChat';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import { Plus, Layers, Check, X, Sparkles, FolderPlus } from 'lucide-react';

interface MediaMemoryWorkspaceProps {
  activeProject: CreativeProject | null;
  activeVersion: MediaVersion | null;
  allVersions: MediaVersion[];
  onSelectVersion: (index: number) => void;
  isGenerating: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  pendingPreferences: Omit<MediaPreference, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[];
  onConfirmRemember: () => void;
  onDismissPending: () => void;
  isSavingMemory: boolean;
  onNewProject: (title?: string, prompt?: string) => void;
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
  activeMemories,
  projects = [],
  currentProjectIndex = 0,
  onSelectProject,
}: MediaMemoryWorkspaceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `Project ${projects.length + 1}`;
    onNewProject(title, newPrompt.trim() || undefined);
    setNewTitle('');
    setNewPrompt('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 font-light text-left">
      {/* Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-medium text-[var(--fg)] tracking-tight font-sans">
              Nue Motion
            </h2>
            {activeProject && (
              <>
                <span className="text-[var(--fg-faint)] text-xs">&middot;</span>
                <span className="text-xs font-mono text-[var(--fg-muted)] px-2 py-0.5 rounded bg-[var(--surface-2)]">
                  {activeProject.title}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--fg-muted)] font-light mt-0.5">
            Autonomous video generation with persistent agent memory.
          </p>
        </div>

        {/* Action Buttons & Project Switcher Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)]/70 max-w-full overflow-x-auto">
              {projects.map((proj, idx) => {
                const isSelected = currentProjectIndex === idx;
                return (
                  <button
                    key={proj.id}
                    onClick={() => onSelectProject?.(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-95 ${
                      isSelected
                        ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs scale-[1.01]'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]/50'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-transform duration-200 ${
                        isSelected ? 'bg-[var(--accent)] scale-125' : 'bg-[var(--fg-faint)]'
                      }`}
                    />
                    <span>{proj.title}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--accent-deep)] text-[var(--accent)] hover:text-[#4a2c0e] hover:scale-105 active:scale-95 transition-all duration-200 shadow-xs flex items-center"
                title="Create New Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* When no projects exist, show clean empty state */}
      {!activeProject ? (
        <div className="interactive-card p-12 sm:p-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 text-center max-w-md mx-auto my-12 space-y-5 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fadeIn">
          <div className="space-y-1.5">
            <h3 className="text-xl font-medium text-[var(--fg)] tracking-tight">
              Create your first project
            </h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Start a new workspace to synthesize media with continuous cross-project agent memory.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <>
          {/* Memory Applied Banner */}
          {activeVersion && activeVersion.appliedPreferences.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--fg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{activeVersion.appliedPreferences.length} learned preferences applied</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeVersion.appliedPreferences.map((pref) => (
                    <span
                      key={pref.id}
                      className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] text-[11px]"
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

          {/* Workspace Split Layout: Media Preview (7 cols) + Agent Chat (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left Column: Media Preview Player */}
            <div className="lg:col-span-7 flex flex-col">
              <MediaPreview
                version={activeVersion}
                allVersions={allVersions}
                selectedVersionIndex={activeProject.currentVersionIndex}
                onSelectVersion={onSelectVersion}
                isLoading={isGenerating}
              />
            </div>

            {/* Right Column: Agent Chat & Extraction Confirmation */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <AgentChat
                messages={messages}
                onSendMessage={onSendMessage}
                onRegenerate={onRegenerate}
                isLoading={isGenerating}
                onSelectSuggestion={(sugg) => onSendMessage(sugg)}
                suggestions={[
                  'Create a 20-second product promo for my new app.',
                  'The intro is too slow. Make the captions much larger and remove the dramatic music.',
                  'Create a launch video for my new product.',
                ]}
              />

              {/* Pending Memory Confirmation Trigger */}
              {pendingPreferences.length > 0 && (
                <MemoryConfirmation
                  detectedPreferences={pendingPreferences}
                  onConfirmRemember={onConfirmRemember}
                  onDismiss={onDismissPending}
                  isSaving={isSavingMemory}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-base font-medium text-[var(--fg)] font-sans">
                  Create New Project
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-[var(--fg-faint)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`Project ${projects.length + 1}`}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] text-xs font-mono focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                  Initial Prompt (Optional)
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Describe your video brief, or leave blank to start in chat..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] text-xs font-mono focus:outline-none focus:border-[var(--accent)] transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium transition shadow-sm"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
