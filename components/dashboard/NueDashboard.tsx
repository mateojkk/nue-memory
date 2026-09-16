'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MemoriesView } from './MemoriesView';
import { MediaMemoryWorkspace } from './MediaMemoryWorkspace';
import { ProjectsView } from './ProjectsView';
import { ApiKeysView } from './ApiKeysView';
import { UsageView } from './OverviewView';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import { NueLogo } from '../NueLogo';
import { ThemeToggle } from '../ThemeToggle';
import { AuthButton } from '../auth/AuthButton';
import {
  ArrowLeft,
  Database,
  Video,
  Layers,
  Key,
  CreditCard,
} from 'lucide-react';

export type DashboardTab =
  | 'memories'
  | 'media-memory'
  | 'projects'
  | 'usage'
  | 'api-keys';

interface NueDashboardProps {
  /** Tab to open on first render. Defaults to 'media-memory'. */
  initialTab?: DashboardTab;
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
  onForgetMemory: (id: string) => void;
  projects: CreativeProject[];
  currentProjectIndex: number;
  onSelectProject: (index: number) => void;
}

export function NueDashboard({
  initialTab = 'media-memory',
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
  onForgetMemory,
  projects,
  currentProjectIndex,
  onSelectProject,
}: NueDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  const navItems = [
    { id: 'media-memory' as DashboardTab, label: 'Motion', icon: Video, highlight: true },
    { id: 'memories' as DashboardTab, label: 'Memories', icon: Database, badge: activeMemories.filter((m) => m.isActive).length },
    { id: 'projects' as DashboardTab, label: 'Projects', icon: Layers, badge: projects.length },
    { id: 'usage' as DashboardTab, label: 'Credits', icon: CreditCard },
    { id: 'api-keys' as DashboardTab, label: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-light flex flex-col">
      {/* Dashboard Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 group hover:opacity-85 transition-all text-left"
              title="Return to Home"
            >
              <NueLogo size={18} showText={false} />
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] font-medium">
                Motion
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>

        {/* Dashboard Sub-navigation Tabs (Section 21) */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 pt-3 overflow-x-auto text-xs font-mono">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-200 whitespace-nowrap hover:-translate-y-0.5 active:scale-95 ${
                  isActive
                    ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium shadow-sm scale-[1.01]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? 'text-[var(--accent)] scale-110' : 'text-[var(--fg-faint)]'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-[var(--fg-muted)] animate-pulse-subtle">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 animate-fadeIn" key={activeTab}>
        {activeTab === 'memories' && (
          <MemoriesView
            memories={activeMemories}
            onForget={onForgetMemory}
            onOpenStudio={() => setActiveTab('media-memory')}
          />
        )}

        {activeTab === 'media-memory' && (
          <MediaMemoryWorkspace
            activeProject={activeProject}
            activeVersion={activeVersion}
            allVersions={allVersions}
            onSelectVersion={onSelectVersion}
            isGenerating={isGenerating}
            messages={messages}
            onSendMessage={onSendMessage}
            onRegenerate={onRegenerate}
            pendingPreferences={pendingPreferences}
            onConfirmRemember={onConfirmRemember}
            onDismissPending={onDismissPending}
            isSavingMemory={isSavingMemory}
            onNewProject={onNewProject}
            activeMemories={activeMemories}
            projects={projects}
            currentProjectIndex={currentProjectIndex}
            onSelectProject={onSelectProject}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            currentProjectIndex={currentProjectIndex}
            onSelectProject={onSelectProject}
            onNewProject={onNewProject}
            onOpenWorkspace={() => setActiveTab('media-memory')}
          />
        )}

        {activeTab === 'usage' && (
          <UsageView
            versions={allVersions}
            onOpenStudio={() => setActiveTab('media-memory')}
          />
        )}

        {activeTab === 'api-keys' && <ApiKeysView />}
      </main>
    </div>
  );
}
