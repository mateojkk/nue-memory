import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { unwrapLivepeerUrl } from '../nue-memory/media-memory/livepeer-agent';

const execFileAsync = promisify(execFile);

export interface StitchOptions {
  jobId: string;
  clips: Array<{ src: string; title?: string }>;
  audioUrl?: string | null;
}

export interface StitchResult {
  url: string;
  durationSeconds: number;
  isMuxed: boolean;
}

/**
 * Downloads a remote URL to a local file path
 */
async function downloadFile(url: string, destination: string, timeoutMs = 30000): Promise<void> {
  const resolvedUrl = unwrapLivepeerUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(resolvedUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(destination, buffer);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stitches multiple video takes and an optional soundtrack into a continuous MP4
 * using the system's ffmpeg installation.
 */
export async function stitchTimelineWithFfmpeg(options: StitchOptions): Promise<StitchResult | null> {
  const { jobId, clips, audioUrl } = options;
  if (!clips || clips.length === 0) return null;

  // If only 1 clip and no audio to mux, no stitching needed
  if (clips.length === 1 && !audioUrl) {
    return {
      url: clips[0].src,
      durationSeconds: 15,
      isMuxed: false,
    };
  }

  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempDir = path.join(os.tmpdir(), `nue-stitch-${safeJobId}`);
  const outDir = path.join(process.cwd(), 'public', 'generated');
  const outputFileName = `${safeJobId}.mp4`;
  const outputPath = path.join(outDir, outputFileName);
  const publicUrl = `/generated/${outputFileName}`;

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.mkdir(outDir, { recursive: true });

    // 1. Download all video clips in parallel
    const clipPaths: string[] = [];
    await Promise.all(
      clips.map(async (clip, idx) => {
        const dest = path.join(tempDir, `clip_${idx}.mp4`);
        await downloadFile(clip.src, dest);
        clipPaths[idx] = dest;
      })
    );

    // 2. Download audio if present
    let audioPath: string | null = null;
    if (audioUrl) {
      try {
        const aDest = path.join(tempDir, 'soundtrack.mp3');
        await downloadFile(audioUrl, aDest);
        audioPath = aDest;
      } catch (audioErr) {
        console.warn('[stitchTimeline] Soundtrack download notice:', audioErr);
      }
    }

    // 3. Build ffmpeg arguments
    const ffmpegArgs: string[] = ['-y'];

    // Add video inputs
    for (const cp of clipPaths) {
      ffmpegArgs.push('-i', cp);
    }

    const n = clipPaths.length;
    let filterComplex = '';

    // Standardize all video inputs to 1080p, 30fps before concatenating to avoid codec/resolution mismatches
    for (let i = 0; i < n; i++) {
      filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}];`;
    }

    // Concat video streams
    let concatInputs = '';
    for (let i = 0; i < n; i++) {
      concatInputs += `[v${i}]`;
    }
    filterComplex += `${concatInputs}concat=n=${n}:v=1:a=0[outv]`;

    ffmpegArgs.push('-filter_complex', filterComplex);
    ffmpegArgs.push('-map', '[outv]');

    if (audioPath) {
      // Add audio input
      const audioInputIndex = n;
      ffmpegArgs.push('-i', audioPath);
      ffmpegArgs.push('-map', `${audioInputIndex}:a`);
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath
    );

    console.log(`[stitchTimeline] Running ffmpeg with ${n} clips (audio: ${Boolean(audioPath)})...`);
    await execFileAsync('ffmpeg', ffmpegArgs, { timeout: 120000 });

    if (fs.existsSync(outputPath)) {
      const stats = await fs.promises.stat(outputPath);
      if (stats.size > 1000) {
        const estimatedDuration = n * 15;
        console.log(`[stitchTimeline] Successfully generated continuous ${estimatedDuration}s MP4 (${stats.size} bytes) at ${publicUrl}`);
        return {
          url: publicUrl,
          durationSeconds: estimatedDuration,
          isMuxed: Boolean(audioPath),
        };
      }
    }
  } catch (err) {
    console.error('[stitchTimeline] Error executing ffmpeg stitch:', err);
  } finally {
    // Clean up temporary downloaded files
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }

  return null;
}
