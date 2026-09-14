'use client';

import React from 'react';
import { Plus, Video, Calendar, ArrowRight, Layers } from 'lucide-react';
import { CreativeProject } from '@/lib/types';

interface ProjectsViewProps {
  projects: CreativeProject[];
  currentProjectIndex: number;
  onSelectProject: (index: number) => void;
  onNewProject: (title?: string, prompt?: string) => void;
  onOpenWorkspace: () => void;
}

export function ProjectsView({
  projects,
  currentProjectIndex,
  onSelectProject,
  onNewProject,
  onOpenWorkspace,
}: ProjectsViewProps) {
  return (
    <div className="space-y-8 font-light text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1">
            Workspaces
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
            Agent Projects
          </h2>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-1">
            Projects share the same underlying Nue Memory layer to demonstrate cross-session context continuity.
          </p>
        </div>

        <button
          onClick={() => onNewProject()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-white text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((proj, idx) => {
          const isSelected = currentProjectIndex === idx;
          return (
            <div
              key={proj.id}
              className={`p-6 rounded-xl border transition flex flex-col justify-between shadow-lg ${
                isSelected
                  ? 'bg-[var(--surface-2)] border-[var(--accent)]/50'
                  : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider">
                    Project 0{idx + 1}
                  </span>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">
                      CURRENT WORKSPACE
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-medium text-[var(--fg)] font-sans">{proj.title}</h3>

                <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--fg-soft)]">
                  Prompt: &ldquo;{proj.initialPrompt}&rdquo;
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

              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  onClick={() => {
                    onSelectProject(idx);
                    onOpenWorkspace();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:text-[var(--fg)] transition"
                >
                  <span>Open in Media Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
