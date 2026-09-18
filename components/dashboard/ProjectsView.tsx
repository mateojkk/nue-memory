'use client';

import React, { useState } from 'react';
import { Plus, Video, Calendar, ArrowRight, Layers, Edit2, CheckCheck, X, Trash2, RotateCcw } from 'lucide-react';
import { CreativeProject } from '@/lib/types';

interface ProjectsViewProps {
  projects: CreativeProject[];
  currentProjectIndex: number;
  onSelectProject: (index: number) => void;
  onNewProject: (title?: string, prompt?: string) => void;
  onRenameProject?: (projectId: string, newTitle: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onResetProject?: (projectId: string) => void;
  onOpenWorkspace: () => void;
}

export function ProjectsView({
  projects,
  currentProjectIndex,
  onSelectProject,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  onResetProject,
  onOpenWorkspace,
}: ProjectsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartEdit = (proj: CreativeProject) => {
    setEditingId(proj.id);
    setEditingTitle(proj.title);
  };

  const handleSaveEdit = (projId: string) => {
    if (editingTitle.trim() && onRenameProject) {
      onRenameProject(projId, editingTitle.trim());
    }
    setEditingId(null);
  };
  return (
    <div className="space-y-8 font-light text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Agent Projects
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Projects share the same underlying Nue Memory layer to demonstrate cross-session context continuity.
          </p>
        </div>

        <button
          onClick={() => onNewProject()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="interactive-card p-12 sm:p-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)]/60 text-center max-w-md mx-auto my-12 space-y-5 shadow-xl animate-fadeIn">
          <div className="space-y-1.5">
            <h3 className="text-xl font-medium text-[var(--fg)] tracking-tight">
              No projects yet
            </h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Create your first project to start generating media with persistent memory recall.
            </p>
          </div>
          <button
            onClick={() => {
              onNewProject();
              onOpenWorkspace();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj, idx) => {
            const isSelected = currentProjectIndex === idx;
            return (
              <div
                key={proj.id}
                className={`interactive-card p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 ${
                  isSelected
                    ? 'bg-[var(--surface-2)] border-[var(--accent)]/50 shadow-md'
                    : 'bg-[var(--surface)] border-[var(--border)]/60 hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider">
                      Project 0{idx + 1}
                    </span>
                    {isSelected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[var(--accent)]/20 text-[var(--accent)] font-medium">
                        CURRENT WORKSPACE
                      </span>
                    )}
                  </div>

                  {editingId === proj.id ? (
                    <div className="flex items-center gap-1.5 my-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(proj.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="px-2.5 py-1 text-sm font-sans bg-[var(--surface)] border border-[var(--accent)] text-[var(--fg)] rounded-lg flex-1 transition"
                      />
                      <button
                        onClick={() => handleSaveEdit(proj.id)}
                        className="p-1.5 rounded-lg bg-[var(--accent-deep)] text-[#4a2c0e] hover:bg-[var(--accent)] transition"
                        title="Save Project Name"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--fg-muted)] transition"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/title">
                      <h3 className="text-lg font-medium text-[var(--fg)] font-sans">{proj.title}</h3>
                      <button
                        onClick={() => handleStartEdit(proj)}
                        className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition opacity-0 group-hover/title:opacity-100"
                        title="Rename Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/60 font-mono text-xs text-[var(--fg-soft)]">
                    Prompt: &ldquo;{proj.initialPrompt || 'No initial prompt'}&rdquo;
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--fg-faint)] pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {proj.versions.length} Version(s) Generated
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--border)]/50 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      onSelectProject(idx);
                      onOpenWorkspace();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:text-[var(--fg)] group transition-all duration-200"
                  >
                    <span>Open in Media Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="flex items-center gap-1">
                    {onResetProject && (
                      <button
                        onClick={() => onResetProject(proj.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition"
                        title="Reset all generated versions in this project"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                    {onDeleteProject && (
                      <button
                        onClick={() => onDeleteProject(proj.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
