'use client';

import React from 'react';
import { MediaPreview } from '@/components/MediaPreview';
import { AgentChat } from '@/components/AgentChat';
import { MemoryConfirmation } from '@/components/MemoryConfirmation';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import { Plus, Sparkles, Layers, ShieldCheck, Database, Check } from 'lucide-react';

interface MediaMemoryWorkspaceProps {
  activeProject: CreativeProject;
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
  onOpenVault: () => void;
  onOpenInspector: () => void;
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
  onOpenVault,
  onOpenInspector,
}: MediaMemoryWorkspaceProps) {
  const activeMemCount = activeMemories.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6 font-light text-left">
      {/* Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider">
              Creative Studio
            </span>
            <span className="text-[var(--fg-faint)] text-xs">&middot;</span>
            <span className="text-xs font-mono text-[var(--fg-muted)]">{activeProject.title}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Media Memory with Livepeer Agent
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Simulate Cross-Project Recall (Step 5 of Demo Flow) */}
          <button
            onClick={() => onNewProject('Project B - Launch Video', 'Create a launch video for my new product.')}
            className="px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--accent-deep)] text-[var(--accent)] text-xs font-mono font-medium flex items-center gap-1.5 border border-[var(--border)] transition shadow-sm"
            title="Start new project without repeating preferences"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Project (Test Memory Recall)</span>
          </button>

          {/* Context Inspector */}
          <button
            onClick={onOpenInspector}
            className="px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--fg-soft)] text-xs font-mono font-medium flex items-center gap-1.5 border border-[var(--border)] transition"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Inspect Context</span>
          </button>
        </div>
      </div>

      {/* Memory Applied Banner (Visibly displays when memories are active in current project) */}
      {activeVersion && activeVersion.appliedPreferences.length > 0 && (
        <div className="p-3.5 rounded-md bg-[var(--surface-2)] border border-emerald-900/50 text-xs font-mono text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Nue Memory: {activeVersion.appliedPreferences.length} relevant memories applied</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeVersion.appliedPreferences.map((pref) => (
                <span
                  key={pref.id}
                  className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-200 text-[11px]"
                >
                  ✓ {pref.preference}
                </span>
              ))}
            </div>
          </div>

          <span className="text-[10px] text-[var(--fg-muted)] shrink-0">
            Retrieved from Walrus MemWal
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
    </div>
  );
}
