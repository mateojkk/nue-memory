'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, Layers, Zap, Image as ImageIcon, Video, ExternalLink } from 'lucide-react';
import { MediaVersion } from '@/lib/types';

interface MediaPreviewProps {
  version: MediaVersion | null;
  allVersions: MediaVersion[];
  selectedVersionIndex: number;
  onSelectVersion: (index: number) => void;
  isLoading?: boolean;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  version,
  allVersions,
  selectedVersionIndex,
  onSelectVersion,
  isLoading = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aspectMode, setAspectMode] = useState<'16:9' | '9:16'>('16:9');
  const [displayMode, setDisplayMode] = useState<'video' | 'keyframe'>('video');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (version?.aspectRatio) {
      setAspectMode(version.aspectRatio === '9:16' ? '9:16' : '16:9');
    }
  }, [version?.aspectRatio]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    setProgress((current / duration) * 100);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Media Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0a08] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dda15e] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dda15e]" />
            </span>
            <span className="text-xs font-semibold text-[#f5f2eb] tracking-tight">
              Livepeer Canvas
            </span>
          </div>

          {version && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1e1510] text-[#dda15e] border border-[#c88d51]/30">
              Version {version.versionNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Display Mode: Video vs Keyframe */}
          {version?.thumbnailUrl && (
            <div className="flex bg-[#140e0b] p-0.5 rounded-lg border border-white/10 text-xs font-medium">
              <button
                onClick={() => setDisplayMode('video')}
                className={`flex items-center gap-1 px-2 py-0.8 rounded-md transition ${
                  displayMode === 'video'
                    ? 'bg-[#fbf7ee] text-[#140e0b] font-semibold shadow-sm'
                    : 'text-[#ab9482] hover:text-[#fbf7ee]'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </button>
              <button
                onClick={() => setDisplayMode('keyframe')}
                className={`flex items-center gap-1 px-2 py-0.8 rounded-md transition ${
                  displayMode === 'keyframe'
                    ? 'bg-[#fbf7ee] text-[#140e0b] font-semibold shadow-sm'
                    : 'text-[#ab9482] hover:text-[#fbf7ee]'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Keyframe</span>
              </button>
            </div>
          )}

          {/* Aspect Ratio Switcher */}
          <div className="flex bg-[#140e0b] p-0.5 rounded-lg border border-white/10 text-xs font-mono">
            <button
              onClick={() => setAspectMode('16:9')}
              className={`px-2.5 py-0.8 rounded-md transition ${
                aspectMode === '16:9'
                  ? 'bg-[#fbf7ee] text-[#140e0b] font-semibold shadow-sm'
                  : 'text-[#ab9482] hover:text-[#fbf7ee]'
              }`}
            >
              16:9
            </button>
            <button
              onClick={() => setAspectMode('9:16')}
              className={`px-2.5 py-0.8 rounded-md transition ${
                aspectMode === '9:16'
                  ? 'bg-[#fbf7ee] text-[#140e0b] font-semibold shadow-sm'
                  : 'text-[#ab9482] hover:text-[#fbf7ee]'
              }`}
            >
              9:16
            </button>
          </div>
        </div>
      </div>

      {/* Main Video/Image Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[390px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3.5 text-center px-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-[#c88d51]/20 border-t-[#dda15e] animate-spin" />
              <Sparkles className="w-5 h-5 text-[#dda15e] absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Livepeer Agent Synthesizing Media
              </h3>
              <p className="text-xs text-[#ab9482] mt-1 max-w-sm font-mono">
                Executing MCP tool · Applying MemWal creative preferences...
              </p>
            </div>
          </div>
        ) : version ? (
          <div
            className={`relative transition-all duration-300 flex items-center justify-center ${
              aspectMode === '9:16'
                ? 'w-[260px] h-[460px] rounded-xl overflow-hidden border border-[#c88d51]/30 shadow-2xl'
                : 'w-full h-full'
            }`}
          >
            {/* If Keyframe mode and thumbnail exists */}
            {displayMode === 'keyframe' && version.thumbnailUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={version.thumbnailUrl}
                  alt="Livepeer Rendered Keyframe"
                  className="w-full h-full object-cover"
                />
                <a
                  href={version.thumbnailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-[11px] font-mono text-[#dda15e] hover:text-white border border-[#c88d51]/30 flex items-center gap-1.5 backdrop-blur-md transition"
                >
                  <span>Open Livepeer Asset</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              /* Full Video Playback */
              <video
                ref={videoRef}
                src={version.mediaUrl}
                loop
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-cover"
                onClick={togglePlay}
              />
            )}

            {/* Overlays reflecting applied preferences */}
            {/* Pacing Badge */}
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#c88d51]/30 text-[11px] font-mono text-[#f5f2eb]">
              <Zap className="w-3 h-3 text-[#dda15e]" />
              <span>
                {version.pacing === 'fast' ? 'Fast Pacing (0-5s Intro)' : 'Cinematic Pacing'}
              </span>
            </div>

            {/* Audio Stem Badge */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#c88d51]/30 text-[11px] font-mono text-[#dda15e]">
              <Volume2 className="w-3 h-3 text-[#c88d51]" />
              <span className="truncate max-w-[150px]">{version.audioStyle.style}</span>
            </div>

            {/* Dynamic Animated Captions */}
            {version.captionStyle?.enabled && displayMode === 'video' && (
              <div className="absolute bottom-16 inset-x-4 z-20 flex flex-col items-center text-center pointer-events-none">
                <div
                  className={`transition-all duration-200 uppercase font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] ${
                    version.captionStyle.size === 'large'
                      ? 'text-lg sm:text-2xl text-[#fef08a] bg-[#140e0b]/90 px-4 py-1.5 rounded-lg border border-[#c88d51]/50'
                      : 'text-xs sm:text-sm text-white bg-black/60 px-3 py-1 rounded border border-white/20'
                  }`}
                >
                  {version.captionStyle.highlight}
                </div>
                <div
                  className={`mt-1 font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                    version.captionStyle.size === 'large' ? 'text-xs sm:text-sm' : 'text-[11px] text-zinc-300'
                  }`}
                >
                  {version.captionStyle.text}
                </div>
              </div>
            )}

            {/* Play/Pause Center Overlay */}
            {displayMode === 'video' && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-[#c88d51]/30 flex items-center justify-center text-[#fbf7ee] opacity-0 hover:opacity-100 transition-opacity z-30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-[#ab9482] text-xs font-mono">
            No media generated yet. Submit a creative brief to begin.
          </div>
        )}
      </div>

      {/* Video Control Scrubber */}
      <div className="px-4 py-2.5 bg-[#0d0a08] border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-1 rounded-md text-[#ab9482] hover:text-[#fbf7ee] hover:bg-white/5 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Progress Bar with Amber/Honey Caramel Gradient */}
          <div className="flex-1 h-1.5 bg-[#1e1510] rounded-full overflow-hidden relative cursor-pointer">
            <div
              className="h-full bg-gradient-to-r from-[#c88d51] via-[#b45a27] to-[#dda15e] rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={toggleMute}
            className="p-1 rounded-md text-[#ab9482] hover:text-[#fbf7ee] hover:bg-white/5 transition"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Applied Preferences Bar */}
        {version && version.appliedPreferences.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-[#ab9482]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[#dda15e] font-medium text-[11px]">
                <Sparkles className="w-3 h-3 text-[#c88d51]" />
                Walrus Memories Applied:
              </span>
              {version.appliedPreferences.map((pref) => (
                <span
                  key={pref.id}
                  className="px-2 py-0.5 rounded-full bg-[#1e1510] border border-[#c88d51]/30 text-[#dda15e] text-[10px] font-mono"
                >
                  {pref.category}: {pref.preference.slice(0, 28)}...
                </span>
              ))}
            </div>
            <span className="text-[#ab9482] font-mono text-[10px]">
              {version.generationDurationSeconds}s · {version.livepeerCapability}
            </span>
          </div>
        )}
      </div>

      {/* Version History Tabs */}
      <div className="px-4 py-2 bg-[#09090b] border-t border-white/5 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-mono text-[#ab9482] uppercase tracking-wider flex items-center gap-1 mr-1">
          <Layers className="w-3 h-3" />
          Versions:
        </span>
        {allVersions.map((v, idx) => (
          <button
            key={v.versionNumber}
            onClick={() => onSelectVersion(idx)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
              selectedVersionIndex === idx
                ? 'bg-[#241a14] border-[#c88d51] text-[#fbf7ee] shadow-sm'
                : 'bg-[#140e0b] border-white/10 text-[#ab9482] hover:text-[#fbf7ee] hover:border-[#c88d51]/40'
            }`}
          >
            <span>v{v.versionNumber}</span>
            {v.appliedPreferences.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#dda15e]" title="Applied persistent memory" />
            )}
            <span className="text-[10px] font-mono text-[#ab9482]">
              {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

