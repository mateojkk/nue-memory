'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Layers } from 'lucide-react';
import { MediaVersion } from '@/lib/types';

interface InlineVideoCardProps {
  version: MediaVersion;
  isLatest?: boolean;
}

export const InlineVideoCard: React.FC<InlineVideoCardProps> = ({ version }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [aspectMode, setAspectMode] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const videoSrc = version.mediaUrl;
  const audioSrc = version.audioStyle?.audioUrl;

  useEffect(() => {
    if (version.aspectRatio) {
      setAspectMode(version.aspectRatio);
    }
  }, [version.aspectRatio]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (audioRef.current && audioSrc) {
            audioRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[InlineVideoCard] Playback notice:', err);
          if (videoRef.current && !videoRef.current.muted) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || version.generationDurationSeconds || 5;
    setCurrentTime(current);
    setProgress((current / duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekPercent = Math.max(0, Math.min(1, clickX / width));
    const duration = videoRef.current.duration || version.generationDurationSeconds || 5;
    const seekTime = seekPercent * duration;

    videoRef.current.currentTime = seekTime;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setProgress(seekPercent * 100);
    setCurrentTime(seekTime);
  };

  const handleDownload = async () => {
    if (!videoSrc) return;
    setIsDownloading(true);
    try {
      const response = await fetch(videoSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `nue-motion-v${version.versionNumber || 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(videoSrc, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const dur = version.generationDurationSeconds || 5;
  const cap = version.livepeerCapability || 'pixverse-t2v';

  return (
    <div className="mt-3 rounded-2xl bg-[var(--surface-2)]/80 overflow-hidden shadow-md max-w-2xl w-full">
      {/* Hidden secondary audio player for un-muxed stems */}
      {audioSrc && <audio ref={audioRef} src={audioSrc} loop />}

      {/* Video Viewport Container */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden group select-none transition-all ${
          aspectMode === '9:16'
            ? 'aspect-[9/16] max-h-[520px]'
            : aspectMode === '1:1'
            ? 'aspect-square max-h-[460px]'
            : 'aspect-video max-h-[420px]'
        }`}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          poster={version.thumbnailUrl}
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
          }}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Big Center Play Button Overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 z-10"
            title="Play video"
          >
            <Play className="w-6 h-6 ml-1 fill-white" />
          </button>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-[11px] font-mono font-medium">
              Version {version.versionNumber} &middot; {dur}s Take
            </span>
            <span className="px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[var(--accent)] text-[10px] font-mono">
              {cap}
            </span>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="pointer-events-auto flex items-center bg-black/70 backdrop-blur-md rounded-md p-0.5 text-[10px] font-mono text-white/80">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectMode(ratio)}
                className={`px-1.5 py-0.5 rounded transition ${
                  aspectMode === ratio ? 'bg-white/20 text-white font-medium' : 'hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col gap-1.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Progress Scrubber */}
          <div
            onClick={handleSeek}
            className="w-full h-1.5 bg-white/20 hover:h-2 rounded-full cursor-pointer relative transition-all overflow-hidden"
          >
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white text-xs pt-0.5 font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 rounded hover:bg-white/20 text-white transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-white/20 text-white transition active:scale-95"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="text-[10px] text-white/70">
                00:{String(Math.floor(currentTime)).padStart(2, '0')} / 00:{String(dur).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {version.scenes && version.scenes.length > 0 && (
                <button
                  onClick={() => setShowStoryboard(!showStoryboard)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/90 flex items-center gap-1 transition"
                  title="Toggle multi-scene storyboard breakdown"
                >
                  <Layers className="w-3 h-3" />
                  <span>{version.scenes.length} Scenes</span>
                </button>
              )}

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-2.5 py-1 rounded-md bg-[var(--accent-deep)] hover:bg-[var(--accent)] text-[#4a2c0e] text-[10px] font-medium flex items-center gap-1 transition active:scale-95 shadow-xs"
                title="Download full MP4 take"
              >
                <Download className="w-3 h-3" />
                <span>{isDownloading ? 'Saving...' : 'Download MP4'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Scene Storyboard Breakdown */}
      {showStoryboard && version.scenes && version.scenes.length > 0 && (
        <div className="p-3 bg-[var(--surface)] animate-fadeIn space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--fg-muted)]">
            <span className="font-medium text-[var(--fg)]">Storyboard Take Sequencing</span>
            <span>{version.scenes.length} Composed Scenes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {version.scenes.map((scene) => (
              <div
                key={scene.sceneNumber}
                className="p-2 rounded-lg bg-[var(--surface-2)] text-[10px] space-y-1"
              >
                <div className="flex items-center justify-between font-mono text-[var(--accent)] font-medium">
                  <span>Take #{scene.sceneNumber}</span>
                  <span>{scene.durationSeconds}s</span>
                </div>
                <div className="text-[var(--fg)] font-medium truncate">{scene.title}</div>
                <div className="text-[var(--fg-muted)] text-[9px] line-clamp-2">{scene.prompt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Details Footer */}
      <div className="p-3 bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {version.audioStyle && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--fg)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
              <span>🎵</span>
              <span className="truncate max-w-[200px]">{version.audioStyle.style}</span>
            </span>
          )}

          {version.appliedPreferences && version.appliedPreferences.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {version.appliedPreferences.map((pref) => (
                <span
                  key={pref.id}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/20 text-emerald-400 text-[10px] font-mono"
                  title="Applied from your preferences"
                >
                  ✓ {pref.preference}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] font-mono text-[var(--fg-faint)] shrink-0">
          AI Generated Video
        </span>
      </div>
    </div>
  );
};
