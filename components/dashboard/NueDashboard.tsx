'use client';

import React, { useState } from 'react';
import { OverviewView } from './OverviewView';
import { MemoriesView } from './MemoriesView';
import { MediaMemoryWorkspace } from './MediaMemoryWorkspace';
import { ProjectsView } from './ProjectsView';
import { ApiKeysView } from './ApiKeysView';
import { DocsView } from './DocsView';
import { CreativeProject, MediaVersion, ChatMessage, MediaPreference } from '@/lib/types';
import { NueLogo } from '../NueLogo';
import {
  ArrowLeft,
  LayoutDashboard,
  Database,
  Video,
  Layers,
  Key,
  BookOpen,
} from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'memories'
  | 'media-memory'
  | 'projects'
  | 'api-keys'
  | 'documentation';

interface NueDashboardProps {
  onBackToLanding: () => void;
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
  onForgetMemory: (id: string) => void;
  projects: CreativeProject[];
  currentProjectIndex: number;
  onSelectProject: (index: number) => void;
}

export function NueDashboard({
  onBackToLanding,
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
  onForgetMemory,
  projects,
  currentProjectIndex,
  onSelectProject,
}: NueDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('media-memory');

  const navItems = [
    { id: 'overview' as DashboardTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'memories' as DashboardTab, label: 'Memories', icon: Database, badge: activeMemories.filter((m) => m.isActive).length },
    { id: 'media-memory' as DashboardTab, label: 'Media Memory', icon: Video, highlight: true },
    { id: 'projects' as DashboardTab, label: 'Projects', icon: Layers, badge: projects.length },
    { id: 'api-keys' as DashboardTab, label: 'API Keys', icon: Key },
    { id: 'documentation' as DashboardTab, label: 'Documentation', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-200 font-light flex flex-col">
      {/* Dashboard Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0c0a09]/95 backdrop-blur-md border-b border-[#241f1a] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141210] hover:bg-[#1a1714] text-xs font-mono text-stone-400 hover:text-white border border-[#241f1a] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>

            <div className="h-4 w-px bg-[#26211d] hidden sm:block" />

            <NueLogo size={24} showText={true} textSize="text-sm" />
          </div>

          {/* Walrus Vault Quick Trigger */}
          <button
            onClick={onOpenVault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141210] hover:border-[#c88d51]/50 text-xs font-mono text-stone-300 hover:text-white border border-[#241f1a] transition"
          >
            <Database className="w-3.5 h-3.5 text-[#c88d51]" />
            <span className="hidden sm:inline">Walrus Vault</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#241e1a] text-stone-400">
              {activeMemories.filter((m) => m.isActive).length}
            </span>
          </button>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1c1815] text-white border border-[#c88d51]/40 font-medium'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#141210] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c88d51]' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-stone-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'overview' && (
          <OverviewView
            memories={activeMemories}
            onOpenWorkspace={() => setActiveTab('media-memory')}
            onOpenMemories={() => setActiveTab('memories')}
          />
        )}

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
            onOpenVault={onOpenVault}
            onOpenInspector={onOpenInspector}
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

        {activeTab === 'api-keys' && <ApiKeysView />}

        {activeTab === 'documentation' && <DocsView />}
      </main>
    </div>
  );
}
