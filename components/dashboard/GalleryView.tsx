'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Download,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  Music,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { CreativeProject, MediaVersion } from '@/lib/types';

interface GalleryItem {
  project: CreativeProject;
  version: MediaVersion;
  versionIndex: number;
}

interface GalleryViewProps {
  projects: CreativeProject[];
  onOpenWorkspace: () => void;
  onSelectProject: (index: number) => void;
  onSelectVersion: (versionIndex: number) => void;
  onDeleteVersion: (projectId: string, versionIndex: number) => void;
}

export function GalleryView({
  projects,
  onOpenWorkspace,
  onSelectProject,
  onSelectVersion,
  onDeleteVersion,
}: GalleryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  // Flatten all versions across all projects into a unified gallery list
  const allItems: GalleryItem[] = projects.flatMap((proj, pIdx) =>
    (proj.versions || []).map((ver, vIdx) => ({
      project: proj,
      version: ver,
      versionIndex: vIdx,
    }))
  );

  // Filter by search query
  const filteredItems = allItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.project.title.toLowerCase().includes(q) ||
      item.version.brief.toLowerCase().includes(q) ||
      (item.version.visualTheme && item.version.visualTheme.toLowerCase().includes(q)) ||
      (item.version.livepeerCapability && item.version.livepeerCapability.toLowerCase().includes(q))
    );
  });

  const handleDownload = async (mediaUrl: string, title: string, versionNumber: number) => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${versionNumber}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(mediaUrl, '_blank');
    }
  };

  const handleGoToChat = (projectId: string, versionIndex: number) => {
    const pIdx = projects.findIndex((p) => p.id === projectId);
    if (pIdx >= 0) {
      onSelectProject(pIdx);
      onSelectVersion(versionIndex);
      onOpenWorkspace();
    }
  };

  return (
    <div className="space-y-8 font-light text-left animate-fadeIn">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--fg)] tracking-tight font-sans">
              Video Gallery
            </h2>
          </div>
          <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-0.5">
            Every video generated across all your chat sessions is preserved here until you delete it.
          </p>
        </div>

        {allItems.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gallery..."
                className="pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono bg-[var(--surface-2)] text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition w-48 sm:w-64"
              />
            </div>
            <div className="text-xs font-mono text-[var(--fg-muted)] px-2.5 py-1 rounded-md bg-[var(--surface-2)] shrink-0">
              {filteredItems.length} {filteredItems.length === 1 ? 'video' : 'videos'}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {allItems.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-2xl bg-[var(--surface)] text-center max-w-md mx-auto my-12 space-y-5 shadow-xl animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto text-[var(--accent)]">
            <Film className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-medium text-[var(--fg)] tracking-tight">
              No videos in gallery yet
            </h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Videos you create in Motion chat sessions are automatically saved here permanently.
            </p>
          </div>
          <button
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Your First Video</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--surface)] text-center max-w-md mx-auto my-8 space-y-3">
          <p className="text-sm text-[var(--fg-muted)]">No videos match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-mono text-[var(--accent)] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Video Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <GalleryItemCard
              key={`${item.project.id}-v${item.version.versionNumber}-${item.versionIndex}`}
              item={item}
              activePlayingUrl={playingUrl}
              setActivePlayingUrl={setPlayingUrl}
              onDownload={handleDownload}
              onGoToChat={handleGoToChat}
              onDelete={onDeleteVersion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GalleryItemCardProps {
  item: GalleryItem;
  activePlayingUrl: string | null;
  setActivePlayingUrl: (url: string | null) => void;
  onDownload: (mediaUrl: string, title: string, versionNumber: number) => void;
  onGoToChat: (projectId: string, versionIndex: number) => void;
  onDelete: (projectId: string, versionIndex: number) => void;
}

function GalleryItemCard({
  item,
  activePlayingUrl,
  setActivePlayingUrl,
  onDownload,
  onGoToChat,
  onDelete,
}: GalleryItemCardProps) {
  const { project, version, versionIndex } = item;
  const durationSec = version.generationDurationSeconds || 5;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // If the audio was muxed into the MP4 container by Livepeer assemble, do NOT play a separate audio element
  const isAudioMuxed = Boolean(
    version.audioStyle?.isMuxed ||
    version.livepeerCapability?.includes('assemble') ||
    version.livepeerCapability?.includes('mux') ||
    version.agentNotes?.includes('Synchronized') ||
    (version.scenes && version.scenes.length > 0)
  );
  const audioSrc = !isAudioMuxed ? version.audioStyle?.audioUrl : undefined;

  const isCurrentPlaying = activePlayingUrl === version.mediaUrl;

  const handlePlay = () => {
    setActivePlayingUrl(version.mediaUrl);
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
    }
    if (!isAudioMuxed && audioRef.current && audioSrc) {
      audioRef.current.currentTime = videoRef.current?.currentTime || 0;
      audioRef.current.muted = videoRef.current?.muted ?? false;
      audioRef.current.volume = videoRef.current?.volume ?? 1;
      audioRef.current.play().catch(() => {});
    }
  };

  const handlePause = () => {
    if (activePlayingUrl === version.mediaUrl) {
      setActivePlayingUrl(null);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleSeeked = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };

  const handleVolumeChange = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.muted = videoRef.current.muted;
      audioRef.current.volume = videoRef.current.volume;
    }
  };

  // Pause if another card starts playing
  useEffect(() => {
    if (!isCurrentPlaying && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isCurrentPlaying]);

  return (
    <div className="group flex flex-col rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all duration-300 overflow-hidden shadow-md hover:shadow-xl">
      {/* Hidden secondary audio player for soundtrack */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          loop
          preload="auto"
          playsInline
        />
      )}

      {/* Video Player / Thumbnail */}
      <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
        <video
          ref={videoRef}
          src={version.mediaUrl}
          poster={version.thumbnailUrl}
          controls
          loop
          playsInline
          className="w-full h-full object-cover"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onVolumeChange={handleVolumeChange}
          onEnded={handlePause}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/70 backdrop-blur-md text-white font-medium flex items-center gap-1 shadow-sm">
            <Clock className="w-2.5 h-2.5 text-[var(--accent)]" />
            <span>{durationSec}s</span>
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/70 backdrop-blur-md text-[var(--fg-muted)] truncate max-w-[140px] shadow-sm">
            {project.title} · v{version.versionNumber}
          </span>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs text-[var(--fg)] line-clamp-2 leading-relaxed font-sans">
            {version.brief}
          </p>

          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-[var(--fg-muted)]">
            {version.visualTheme && (
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--fg-muted)]">
                {version.visualTheme}
              </span>
            )}

            {version.audioStyle?.enabled && version.audioStyle?.style && (
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] flex items-center gap-1">
                <Music className="w-2.5 h-2.5" />
                <span>Soundtrack</span>
              </span>
            )}

            {version.aspectRatio && (
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)]">
                {version.aspectRatio}
              </span>
            )}
          </div>
        </div>

        {/* Card Action Footer */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-[var(--fg-faint)] flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            <span>
              {version.createdAt
                ? new Date(version.createdAt).toLocaleDateString()
                : 'Recent'}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                onDownload(version.mediaUrl, project.title, version.versionNumber)
              }
              className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition"
              title="Download MP4 video"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onGoToChat(project.id, versionIndex)}
              className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--accent)] hover:text-[var(--fg)] transition flex items-center gap-1 text-[11px] font-mono"
              title="Open this project in chat"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete version ${version.versionNumber} of "${project.title}"? This video will be removed from your gallery.`
                  )
                ) {
                  onDelete(project.id, versionIndex);
                }
              }}
              className="p-1.5 rounded-md hover:bg-red-950/20 text-[var(--fg-muted)] hover:text-red-400 transition"
              title="Delete video from gallery"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
