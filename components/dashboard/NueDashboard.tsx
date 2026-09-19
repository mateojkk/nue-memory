'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Video,
  Layers,
  Key,
  CreditCard,
} from 'lucide-react';

export type DashboardTab =
  | 'media-memory'
  | 'projects'
  | 'usage'
  | 'api-keys'
  | 'memories';

const VALID_TABS: DashboardTab[] = ['media-memory', 'projects', 'usage', 'api-keys'];

function getResolvedTab(initialTab?: DashboardTab): DashboardTab {
  if (typeof window !== 'undefined') {
    try {
      const urlTab = new URLSearchParams(window.location.search).get('tab') as DashboardTab | null;
      if (urlTab && VALID_TABS.includes(urlTab)) {
        return urlTab;
      }
      const savedTab = localStorage.getItem('nue_active_tab') as DashboardTab | null;
      if (savedTab && VALID_TABS.includes(savedTab)) {
        return savedTab;
      }
    } catch {
      // In case of restricted storage environments
    }
  }
  if (initialTab && VALID_TABS.includes(initialTab)) {
    return initialTab;
  }
  return 'media-memory';
}

interface NueDashboardProps {
  /** Tab to open on first render. Defaults to 'media-memory'. */
  initialTab?: DashboardTab;
  activeProject: CreativeProject;
  activeVersion: MediaVersion | null;
  allVersions: MediaVersion[];
  onSelectVersion: (index: number) => void;
  isGenerating: boolean;
  generationStage?: 'thinking' | 'cooking' | null;
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
  onForgetMemory: (id: string) => void;
  projects: CreativeProject[];
  currentProjectIndex: number;
  onSelectProject: (index: number) => void;
  userNamespace?: string;
  userEmail?: string;
}

export function NueDashboard({
  initialTab = 'media-memory',
  activeProject,
  activeVersion,
  allVersions,
  onSelectVersion,
  isGenerating,
  generationStage = 'thinking',
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
  onForgetMemory,
  projects,
  currentProjectIndex,
  onSelectProject,
  userNamespace,
  userEmail,
}: NueDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => getResolvedTab(initialTab));

  const handleTabChange = (newTab: DashboardTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nue_active_tab', newTab);
        const url = new URL(window.location.href);
        if (url.searchParams.get('tab') !== newTab) {
          url.searchParams.set('tab', newTab);
          window.history.replaceState(null, '', url.toString());
        }
      } catch {
        // Fallback for restricted storage environments
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentResolved = getResolvedTab(initialTab);
    if (currentResolved !== activeTab) {
      setActiveTab(currentResolved);
    }

    try {
      localStorage.setItem('nue_active_tab', currentResolved);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== currentResolved) {
        url.searchParams.set('tab', currentResolved);
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // Ignore storage errors
    }

    const handlePopState = () => {
      try {
        const p = new URLSearchParams(window.location.search);
        const t = p.get('tab') as DashboardTab | null;
        if (t && VALID_TABS.includes(t)) {
          setActiveTab(t);
          localStorage.setItem('nue_active_tab', t);
        }
      } catch {
        // Ignore storage errors
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialTab]);

  const navItems = [
    { id: 'media-memory' as DashboardTab, label: 'Motion', icon: Video, highlight: true },
    { id: 'projects' as DashboardTab, label: 'Projects', icon: Layers, badge: projects.length },
    { id: 'usage' as DashboardTab, label: 'Credits', icon: CreditCard },
    { id: 'api-keys' as DashboardTab, label: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-light flex flex-col">
      {/* Dashboard Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
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

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>

        {/* Dashboard Sub-navigation Tabs (Section 21) */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 pt-2.5 sm:pt-3 overflow-x-auto no-scrollbar text-xs font-mono pb-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg transition-all duration-200 whitespace-nowrap active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium shadow-sm'
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

        {activeTab === 'media-memory' && (
          <MediaMemoryWorkspace
            activeProject={activeProject}
            activeVersion={activeVersion}
            allVersions={allVersions}
            onSelectVersion={onSelectVersion}
            isGenerating={isGenerating}
            generationStage={generationStage}
            messages={messages}
            onSendMessage={onSendMessage}
            onRegenerate={onRegenerate}
            pendingPreferences={pendingPreferences}
            onConfirmRemember={onConfirmRemember}
            onDismissPending={onDismissPending}
            isSavingMemory={isSavingMemory}
            onNewProject={onNewProject}
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            onResetProject={onResetProject}
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
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            onResetProject={onResetProject}
            onOpenWorkspace={() => handleTabChange('media-memory')}
          />
        )}

        {activeTab === 'usage' && (
          <UsageView
            versions={projects.flatMap((p) => p.versions || [])}
            onOpenStudio={() => handleTabChange('media-memory')}
          />
        )}

        {activeTab === 'api-keys' && <ApiKeysView />}
      </main>
    </div>
  );
}
