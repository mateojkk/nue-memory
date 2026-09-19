'use client';

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../auth/useAuth';
import {
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Database,
  Video,
  Layers,
  Key,
  CreditCard,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export type DashboardTab =
  | 'memories'
  | 'media-memory'
  | 'projects'
  | 'usage'
  | 'api-keys';

const VALID_TABS: DashboardTab[] = ['media-memory', 'memories', 'projects', 'usage', 'api-keys'];

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
      // Fallback
    }
  }
  if (initialTab && VALID_TABS.includes(initialTab)) {
    return initialTab;
  }
  return 'media-memory';
}

interface NueDashboardProps {
  initialTab?: DashboardTab;
  activeProject: CreativeProject;
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
  const { creditBalance, email } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => getResolvedTab(initialTab));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Handle responsive sidebar behavior on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

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
        // Fallback
      }
    }
  };

  const handleSelectProjectFromSidebar = (index: number) => {
    onSelectProject(index);
    if (activeTab !== 'media-memory') {
      handleTabChange('media-memory');
    }
    // On mobile, auto-close sidebar after selection
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleStartRename = (proj: CreativeProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditingTitle(proj.title);
  };

  const handleSaveRename = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim() && onRenameProject) {
      onRenameProject(projectId, editingTitle.trim());
    }
    setEditingProjectId(null);
  };

  const handleDeleteProjectFromSidebar = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteProject) {
      onDeleteProject(projectId);
    }
  };

  const displayEmail = userEmail || email || 'thesaintszn@gmail.com';
  const displayCredits = typeof creditBalance === 'number' ? creditBalance.toFixed(2) : '10.00';

  const navTabs = [
    { id: 'media-memory' as DashboardTab, label: 'Motion', icon: Video },
    { id: 'memories' as DashboardTab, label: 'Memories', icon: Database, badge: activeMemories.filter((m) => m.isActive).length },
    { id: 'projects' as DashboardTab, label: 'Projects', icon: Layers, badge: projects.length },
    { id: 'usage' as DashboardTab, label: 'Credits', icon: CreditCard },
    { id: 'api-keys' as DashboardTab, label: 'API Keys', icon: Key },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-light select-none">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fadeIn"
        />
      )}

      {/* ChatGPT Collapsible Left Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 ease-in-out shrink-0 select-none ${
          isSidebarOpen
            ? 'w-72 sm:w-80 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 group hover:opacity-85 transition-opacity text-left"
            title="Return to Home"
          >
            <NueLogo size={20} showText={false} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--fg)] tracking-tight">Nue Motion</span>
              <span className="text-[9px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">
                Creative Studio
              </span>
            </div>
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Project Button (ChatGPT Style "+ New chat" pill) */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => {
              onNewProject();
              if (activeTab !== 'media-memory') {
                handleTabChange('media-memory');
              }
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsSidebarOpen(false);
              }
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-xs font-medium transition-all duration-200 group active:scale-[0.99] shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--accent)] group-hover:text-[#4a2c0e] transition-colors" />
              <span>New project</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--fg-muted)] group-hover:text-[#4a2c0e]/70">
              Create
            </span>
          </button>
        </div>

        {/* Conversation / Project History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">
            <span>Chat History</span>
            <span>{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[var(--fg-muted)] font-light space-y-1">
              <MessageSquare className="w-4 h-4 mx-auto text-[var(--fg-faint)]" />
              <p>No chat history yet</p>
              <p className="text-[10px]">Start your first project above</p>
            </div>
          ) : (
            projects.map((proj, idx) => {
              const isSelected = currentProjectIndex === idx && activeTab === 'media-memory';
              const isEditing = editingProjectId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProjectFromSidebar(idx)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium shadow-xs border-l-2 border-[var(--accent)]'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-[var(--accent)]' : 'text-[var(--fg-faint)] group-hover:text-[var(--fg-muted)]'
                      }`}
                    />

                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(proj.id);
                            if (e.key === 'Escape') setEditingProjectId(null);
                          }}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs font-mono bg-[var(--surface)] border border-[var(--accent)] text-[var(--fg)] rounded focus:outline-none"
                        />
                        <button
                          onClick={(e) => handleSaveRename(proj.id, e)}
                          className="p-1 text-[var(--accent)] hover:text-[var(--fg)]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProjectId(null);
                          }}
                          className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate flex-1 text-left">{proj.title}</span>
                    )}
                  </div>

                  {/* Hover Actions: Rename & Delete */}
                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleStartRename(proj, e)}
                        className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition"
                        title="Rename project"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProjectFromSidebar(proj.id, e)}
                        className="p-1 rounded text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-950/20 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Navigation Links */}
        <div className="p-2.5 border-t border-[var(--border)] space-y-1 shrink-0 bg-[var(--surface)]">
          <button
            onClick={() => handleTabChange('memories')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              activeTab === 'memories'
                ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Memories</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/30 text-emerald-400 border border-emerald-800/30 font-mono">
              {activeMemories.filter((m) => m.isActive).length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('usage')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              activeTab === 'usage'
                ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Credits</span>
            </div>
            <span className="text-[10px] font-mono font-medium text-[var(--fg)]">
              ${displayCredits}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('api-keys')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              activeTab === 'api-keys'
                ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
              <span>API Keys</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[var(--fg-faint)]" />
          </button>
        </div>

        {/* User Profile Card at Bottom of Sidebar */}
        <div className="p-3 border-t border-[var(--border)] shrink-0 bg-[var(--surface-2)]/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-[var(--accent)] text-[#4a2c0e] flex items-center justify-center text-xs font-medium shrink-0">
                <span>{displayEmail.slice(0, 2).toUpperCase()}</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[var(--fg)] truncate">
                  {displayEmail}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--fg-muted)] font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>MemWal Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="px-4 sm:px-6 py-2.5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg)]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Quick Breadcrumb / Surface Tab Switcher */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-[var(--surface-2)] text-[var(--fg)] font-medium shadow-xs'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--fg-faint)]'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/40 text-[var(--fg-muted)]">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <>
                <AuthButton />
                <ThemeToggle />
              </>
            )}
          </div>
        </header>

        {/* View Container */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
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
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
              onResetProject={onResetProject}
              activeMemories={activeMemories}
              projects={projects}
              currentProjectIndex={currentProjectIndex}
              onSelectProject={onSelectProject}
            />
          )}

          {activeTab === 'memories' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto animate-fadeIn">
              <MemoriesView
                memories={activeMemories}
                onForget={onForgetMemory}
                onOpenStudio={() => handleTabChange('media-memory')}
                userNamespace={userNamespace}
                userEmail={userEmail}
              />
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto animate-fadeIn">
              <ProjectsView
                projects={projects}
                currentProjectIndex={currentProjectIndex}
                onSelectProject={(idx) => {
                  onSelectProject(idx);
                  handleTabChange('media-memory');
                }}
                onNewProject={onNewProject}
                onRenameProject={onRenameProject}
                onDeleteProject={onDeleteProject}
                onResetProject={onResetProject}
                onOpenWorkspace={() => handleTabChange('media-memory')}
              />
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto animate-fadeIn">
              <UsageView
                versions={projects.flatMap((p) => p.versions || [])}
                onOpenStudio={() => handleTabChange('media-memory')}
              />
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto animate-fadeIn">
              <ApiKeysView />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
