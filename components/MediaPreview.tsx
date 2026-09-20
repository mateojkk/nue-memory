'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, Layers, Zap, Image as ImageIcon, Video, ExternalLink, Download, Subtitles, Crop, Wand2, ShieldCheck, Loader2, Check } from 'lucide-react';
import { MediaVersion } from '@/lib/types';

interface MediaPreviewProps {
  version: MediaVersion | null;
  allVersions: MediaVersion[];
  selectedVersionIndex: number;
  onSelectVersion: (index: number) => void;
  isLoading?: boolean;
  projectId?: string;
  userEmail?: string;
  onRefreshProjects?: () => void;
}

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('agent.livepeer.org/a/')) {
    const match = url.match(/\/a\/([a-zA-Z0-9_\-=]+)/);
    if (match) {
      try {
        const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = typeof window !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
        if (decoded.startsWith('http')) return decoded;
      } catch {}
    }
  }
  return url;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  version,
  allVersions,
  selectedVersionIndex,
  onSelectVersion,
  isLoading = false,
  projectId,
  userEmail,
  onRefreshProjects,
}) => {
  const [activeStudioAction, setActiveStudioAction] = useState<string | null>(null);
  const [studioFeedback, setStudioFeedback] = useState<string | null>(null);

  const handleTriggerStudioAction = async (action: string) => {
    if (!projectId) {
      setStudioFeedback('No active project found');
      setTimeout(() => setStudioFeedback(null), 3000);
      return;
    }
    setActiveStudioAction(action);
    setStudioFeedback(null);
    try {
      const emailToUse = userEmail || (typeof window !== 'undefined' ? localStorage.getItem('nue_user_email') : undefined);
      const res = await fetch('/api/studio-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, email: emailToUse, action }),
      });
      const data = await res.json();
      if (data.success) {
        setStudioFeedback(`Created Version ${data.version.versionNumber}!`);
        if (onRefreshProjects) {
          onRefreshProjects();
        }
      } else {
        setStudioFeedback(data.error || 'Studio processing failed');
      }
    } catch (err: any) {
      setStudioFeedback(err?.message || 'Network error');
    } finally {
      setActiveStudioAction(null);
      setTimeout(() => setStudioFeedback(null), 4000);
    }
  };

  const resolvedMediaUrl = resolveMediaUrl(version?.mediaUrl);
  const isVideoAsset = Boolean(
    resolvedMediaUrl &&
    (resolvedMediaUrl.endsWith('.mp4') ||
     resolvedMediaUrl.endsWith('.webm') ||
     resolvedMediaUrl.includes('.mp4') ||
     resolvedMediaUrl.includes('video') ||
     version?.livepeerCapability?.includes('pixverse') ||
     version?.livepeerCapability?.includes('t2v') ||
     version?.livepeerCapability?.includes('video'))
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCaptions, setShowCaptions] = useState(false);
  const [aspectMode, setAspectMode] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [displayMode, setDisplayMode] = useState<'video' | 'keyframe'>('video');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (version?.aspectRatio) {
      setAspectMode(version.aspectRatio);
    }
    if (version?.mediaUrl) {
      const isVid =
        version.mediaUrl.endsWith('.mp4') ||
        version.mediaUrl.endsWith('.webm') ||
        version.mediaUrl.includes('.mp4') ||
        version.mediaUrl.includes('video') ||
        version.livepeerCapability?.includes('pixverse') ||
        version.livepeerCapability?.includes('t2v') ||
        version.livepeerCapability?.includes('video');
      setDisplayMode(isVid ? 'video' : 'keyframe');
      setIsPlaying(false);
      setProgress(0);
    }

    const isAudioMuxed = Boolean(
      version?.audioStyle?.isMuxed ||
      version?.livepeerCapability?.includes('assemble') ||
      version?.livepeerCapability?.includes('mux') ||
      version?.agentNotes?.includes('Synchronized') ||
      (version?.scenes && version.scenes.length > 0)
    );

    if (!isAudioMuxed && version?.audioStyle?.audioUrl && audioRef.current) {
      audioRef.current.src = version.audioStyle.audioUrl;
      audioRef.current.currentTime = 0;
    }
  }, [version]);

  const isAudioMuxed = Boolean(
    version?.audioStyle?.isMuxed ||
    version?.livepeerCapability?.includes('assemble') ||
    version?.livepeerCapability?.includes('mux') ||
    version?.agentNotes?.includes('Synchronized') ||
    (version?.scenes && version.scenes.length > 0)
  );
  const unMuxedAudioUrl = !isAudioMuxed ? version?.audioStyle?.audioUrl : undefined;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.muted && !isMuted) {
        videoRef.current.muted = false;
      }
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (!isAudioMuxed && audioRef.current && unMuxedAudioUrl) {
            audioRef.current.muted = isMuted;
            audioRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[MediaPreview] Playback failed or was blocked by browser:', err);
          // Try playing muted if autoplay policy blocked audio playback
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
      if (!nextMuted && isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(curr);
    setProgress((curr / dur) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, clickPos));
    const dur = videoRef.current.duration || 1;
    const newTime = clampedPos * dur;
    videoRef.current.currentTime = newTime;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setProgress(clampedPos * 100);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportMp4 = async () => {
    if (!version?.mediaUrl) return;
    setIsExporting(true);
    try {
      const response = await fetch(version.mediaUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `nue-v${version.versionNumber}-${version.visualTheme.replace(/\s+/g, '-').toLowerCase()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[MediaPreview] Direct blob download fallback:', err);
      // Fallback: direct window download
      window.open(version.mediaUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVtt = () => {
    if (!version?.captionStyle) return;
    const dur = version.generationDurationSeconds || 5;
    const formatTime = (sec: number) => {
      const s = Math.floor(sec);
      const ms = Math.floor((sec - s) * 1000);
      return `00:00:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    const vtt = `WEBVTT - Nue Motion Subtitle Export

00:00:00.500 --> ${formatTime(Math.min(3, dur))}
${version.captionStyle.highlight}

00:00:01.000 --> ${formatTime(dur)}
${version.captionStyle.text}
`;

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nue-v${version.versionNumber}-subtitles.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col overflow-hidden h-full">
      {/* Top Media Info Bar */}
      <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--fg)]">
              {version ? `Version ${version.versionNumber}` : 'Workspace Canvas'}
            </span>
          </div>
          {version && (
            <span className="text-[11px] font-mono text-[var(--fg-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
              {version.visualTheme}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Display Mode: Video vs Keyframe */}
          {version?.thumbnailUrl && (
            <div className="flex bg-[var(--surface-2)]/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setDisplayMode('video')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-200 ${
                  displayMode === 'video'
                    ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs scale-[1.02]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </button>
              <button
                onClick={() => setDisplayMode('keyframe')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-200 ${
                  displayMode === 'keyframe'
                    ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs scale-[1.02]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Keyframe</span>
              </button>
            </div>
          )}

          {/* Platform Format Presets & Aspect Switcher */}
          <div className="flex items-center gap-1">
            <div className="flex bg-[var(--surface-2)]/80 p-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => setAspectMode('16:9')}
                className={`px-2.5 py-1 rounded-md transition-all duration-200 ${
                  aspectMode === '16:9'
                    ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs scale-[1.02]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                title="YouTube / Web (1920x1080 Widescreen)"
              >
                16:9 Web
              </button>
              <button
                onClick={() => setAspectMode('9:16')}
                className={`px-2.5 py-1 rounded-md transition-all duration-200 ${
                  aspectMode === '9:16'
                    ? 'bg-[var(--surface)] text-[var(--fg)] font-medium shadow-xs scale-[1.02]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                title="TikTok / YouTube Shorts / Reels (1080x1920 Vertical)"
              >
                9:16 Reel
              </button>
            </div>
          </div>

          {/* Export / Download Actions */}
          {version?.mediaUrl && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportMp4}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] text-[var(--fg)] text-xs font-mono border border-[var(--border)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Download direct MP4 binary"
              >
                <Download className="w-3 h-3 text-[var(--accent)]" />
                <span>{isExporting ? 'Exporting...' : 'Export MP4'}</span>
              </button>
              {version.captionStyle && (
                <button
                  onClick={handleExportVtt}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] text-[11px] font-mono border border-[var(--border)] transition-all duration-200"
                  title="Export synchronized .VTT Subtitles file for YouTube / TikTok"
                >
                  <span>.VTT</span>
                </button>
              )}
              <a
                href={version.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-md bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border)] transition"
                title="Open raw stream in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Video/Image Viewport */}
      <div className="relative flex-1 bg-[#0a0a0c] flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[380px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3.5 text-center px-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent-bright)] animate-spin" />
              <Sparkles className="w-5 h-5 text-[var(--accent-bright)] absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--fg)] tracking-tight">
                Crafting your video...
              </h3>
              <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-sm">
                Applying your visual style and learned preferences
              </p>
            </div>
          </div>
        ) : version ? (
          <div
            className={`relative transition-all duration-300 flex items-center justify-center ${
              aspectMode === '9:16'
                ? 'w-[200px] sm:w-[250px] h-[355px] sm:h-[440px] rounded-xl overflow-hidden border border-[var(--accent)]/30'
                : 'w-full h-full'
            }`}
          >
            {/* If Keyframe mode, or asset is an image/fallback */}
            {(displayMode === 'keyframe' || !isVideoAsset) ? (
              <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={version.thumbnailUrl || version.mediaUrl}
                  alt="Livepeer Rendered Asset"
                  className="w-full h-full object-cover"
                />
                <a
                  href={version.mediaUrl || version.thumbnailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 z-30 px-2.5 py-1 rounded-md bg-black/80 hover:bg-black text-[11px] font-mono text-[var(--accent-bright)] hover:text-[var(--fg)] border border-[var(--accent)]/30 flex items-center gap-1.5 backdrop-blur-md transition"
                >
                  <span>Open Livepeer Asset</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              /* Full Video Playback */
              <>
                <video
                  ref={videoRef}
                  src={resolvedMediaUrl}
                  loop
                  playsInline
                  autoPlay
                  preload="auto"
                  crossOrigin="anonymous"
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => {
                    // If browser fails to decode as video, seamlessly switch to high-res viewer
                    setDisplayMode('keyframe');
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={togglePlay}
                />
                {!isAudioMuxed && unMuxedAudioUrl && (
                  <audio
                    ref={audioRef}
                    src={unMuxedAudioUrl}
                    loop
                    muted={isMuted}
                    playsInline
                  />
                )}
              </>
            )}

            {/* Overlays reflecting applied preferences */}
            {/* Pacing Badge */}
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-[var(--accent)]/30 text-[11px] font-mono text-white">
              <Zap className="w-3 h-3 text-[var(--accent-bright)]" />
              <span>
                {version.pacing === 'fast' ? 'Fast Pacing (0-5s Intro)' : 'Cinematic Pacing'}
              </span>
            </div>

            {/* Audio Stem Badge */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-[var(--accent)]/30 text-[11px] font-mono text-[var(--accent-bright)]">
              <Volume2 className="w-3 h-3 text-[var(--accent)]" />
              <span className="truncate max-w-[150px]">{version.audioStyle.style}</span>
              {version.audioStyle?.audioUrl && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Livepeer AI Soundtrack Active" />
              )}
            </div>

            {/* Dynamic Animated Captions (Controlled via CC toggle and timed with playback) */}
            {version.captionStyle?.enabled && showCaptions && displayMode === 'video' && (
              <div className="absolute bottom-16 inset-x-4 z-20 flex flex-col items-center text-center pointer-events-none animate-fadeIn">
                {currentTime < (version.generationDurationSeconds ? version.generationDurationSeconds * 0.6 : 3) && (
                  <div
                    className={`transition-all duration-300 uppercase font-medium tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] ${
                      version.captionStyle.size === 'large'
                        ? 'text-base sm:text-xl text-[#fef08a] bg-black/80 px-4 py-1.5 rounded-md border border-[var(--accent)]/50'
                        : 'text-xs sm:text-sm text-[var(--fg)] bg-black/60 px-3 py-1 rounded border border-white/20'
                    }`}
                  >
                    {version.captionStyle.highlight}
                  </div>
                )}
                {currentTime >= 1 && (
                  <div
                    className={`mt-1 font-medium text-[var(--fg)]/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${
                      version.captionStyle.size === 'large' ? 'text-xs sm:text-sm' : 'text-[11px] text-zinc-300'
                    }`}
                  >
                    {version.captionStyle.text}
                  </div>
                )}
              </div>
            )}

            {/* Play/Pause Center Overlay */}
            {displayMode === 'video' && (
              <button
                onClick={togglePlay}
                className={`absolute inset-0 m-auto w-12 h-12 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-[var(--accent)]/30 flex items-center justify-center text-white transition-opacity z-30 ${
                  isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-[var(--fg-faint)] text-xs font-mono">
            No media generated yet. Submit a creative brief to begin.
          </div>
        )}
      </div>

      {/* Video Control Scrubber */}
      <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]/60 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] hover:scale-110 active:scale-90 transition-all duration-200"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Progress Bar with Accent Gradient */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden relative cursor-pointer"
          >
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-deep)] via-[var(--accent)] to-[var(--accent-bright)] rounded-full transition-all duration-150 ease-out pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] hover:scale-110 active:scale-90 transition-all duration-200"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {version?.captionStyle && (
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all duration-200 flex items-center gap-1 ${
                showCaptions
                  ? 'bg-[var(--accent-deep)] text-[#4a2c0e] font-medium shadow-xs'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]'
              }`}
              title="Toggle On-Screen Captions (CC)"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>CC</span>
            </button>
          )}
        </div>

        {/* Applied Preferences Bar */}
        {version && version.appliedPreferences.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]/50 text-[var(--fg-muted)] animate-fadeIn">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[var(--accent)] font-medium text-[11px]">
                <Sparkles className="w-3 h-3 text-[var(--accent)] animate-pulse-subtle" />
                Learned Preferences Applied:
              </span>
              {version.appliedPreferences.map((pref) => (
                <span
                  key={pref.id}
                  className="px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--fg)] text-[10px] font-mono font-medium hover:scale-105 transition-all duration-200"
                >
                  ✓ {pref.preference}
                </span>
              ))}
            </div>
            <span className="text-[var(--fg-muted)] font-mono text-[10px]">
              {version.generationDurationSeconds}s · {version.livepeerCapability}
            </span>
          </div>
        )}

        {/* Storyboard Multi-Scene Sequence Breakdown */}
        {version?.scenes && version.scenes.length > 0 && (
          <div className="pt-2 border-t border-[var(--border)]/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono text-[var(--accent)] uppercase shrink-0 font-medium">
              Storyboard ({version.scenes.length} Takes):
            </span>
            <div className="flex items-center gap-1.5">
              {version.scenes.map((sc) => (
                <div
                  key={sc.sceneNumber}
                  className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-[var(--fg)] border border-[var(--border)] flex items-center gap-1 shrink-0"
                  title={sc.prompt}
                >
                  <span className="text-[var(--accent)] font-semibold">#{sc.sceneNumber}</span>
                  <span>{sc.title}</span>
                  <span className="text-[var(--fg-faint)]">({sc.durationSeconds}s)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Livepeer Studio Suite Action Bar */}
      {version && (
        <div className="px-4 py-2 bg-[var(--surface-2)]/70 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-[var(--accent)] font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-[var(--accent)]" />
              Livepeer Studio:
            </span>
            <button
              type="button"
              disabled={Boolean(activeStudioAction)}
              onClick={() => handleTriggerStudioAction('burn_subtitles')}
              className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-[10px] font-mono text-[var(--fg)] flex items-center gap-1 transition disabled:opacity-50 shadow-xs"
              title="Burn karaoke subtitles directly into MP4 via Livepeer transcribe"
            >
              <Subtitles className="w-3 h-3 text-[var(--accent)]" />
              <span>Burn Subtitles</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeStudioAction)}
              onClick={() => handleTriggerStudioAction('reframe_9_16')}
              className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-[10px] font-mono text-[var(--fg)] flex items-center gap-1 transition disabled:opacity-50 shadow-xs"
              title="Convert 16:9 widescreen to 9:16 vertical for TikTok & Reels via Livepeer edit_clip"
            >
              <Crop className="w-3 h-3 text-[var(--accent)]" />
              <span>Reframe 9:16</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeStudioAction)}
              onClick={() => handleTriggerStudioAction('clean_audio')}
              className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-[10px] font-mono text-[var(--fg)] flex items-center gap-1 transition disabled:opacity-50 shadow-xs"
              title="Remove filler words and pauses via Livepeer clean_speech"
            >
              <Wand2 className="w-3 h-3 text-[var(--accent)]" />
              <span>Clean Speech</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeStudioAction)}
              onClick={() => handleTriggerStudioAction('add_watermark')}
              className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-[10px] font-mono text-[var(--fg)] flex items-center gap-1 transition disabled:opacity-50 shadow-xs"
              title="Overlay brand watermark onto video via Livepeer overlay"
            >
              <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
              <span>Watermark</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeStudioAction)}
              onClick={() => handleTriggerStudioAction('add_voiceover')}
              className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--accent-deep)] hover:text-[#4a2c0e] border border-[var(--border)] text-[10px] font-mono text-[var(--fg)] flex items-center gap-1 transition disabled:opacity-50 shadow-xs"
              title="Generate spoken narration via Livepeer Gemini TTS and mix into timeline"
            >
              <Volume2 className="w-3 h-3 text-[var(--accent)]" />
              <span>Voiceover</span>
            </button>
          </div>

          {activeStudioAction && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--accent)] font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing Livepeer {activeStudioAction}...</span>
            </div>
          )}

          {studioFeedback && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <Check className="w-3 h-3" />
              <span>{studioFeedback}</span>
            </div>
          )}
        </div>
      )}

      {/* Version History Tabs */}
      <div className="px-4 py-2.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <Layers className="w-3 h-3" />
          Versions:
        </span>
        {allVersions.map((v, idx) => (
          <button
            key={v.versionNumber}
            onClick={() => onSelectVersion(idx)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 border ${
              selectedVersionIndex === idx
                ? 'bg-[var(--surface-2)] border-[var(--accent)]/50 text-[var(--fg)] shadow-xs'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/40'
            }`}
          >
            <span>v{v.versionNumber}</span>
            {v.appliedPreferences.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-bright)]" title="Applied persistent memory" />
            )}
            <span className="text-[10px] font-mono opacity-80">
              {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
