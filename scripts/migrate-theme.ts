/**
 * One-shot theme migration: replaces hardcoded obsidian/brown hex colors and
 * stone-* text classes in app/ + components/ with semantic CSS variables
 * defined in app/globals.css (light default + .dark override).
 * Run: npx tsx scripts/migrate-theme.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOTS = ['app', 'components'];

// Exact hex -> token. Case-insensitive.
const HEX_MAP: Record<string, string> = {
  // page background
  '#0c0a09': 'var(--bg)',
  // card / panel surfaces (dark originals + legacy light neutrals)
  '#0f0e0c': 'var(--surface)',
  '#100d0b': 'var(--surface)',
  '#12100e': 'var(--surface)',
  '#14110f': 'var(--surface)',
  '#141210': 'var(--surface)',
  '#18120e': 'var(--surface)',
  '#faf6f0': 'var(--surface)',
  '#faf8f5': 'var(--surface)',
  '#fbf2e9': 'var(--surface)',
  '#fbf7ee': 'var(--surface)',
  '#f5ece4': 'var(--surface)',
  // elevated / inset surfaces
  '#171411': 'var(--surface-2)',
  '#181512': 'var(--surface-2)',
  '#1a1714': 'var(--surface-2)',
  '#1c1815': 'var(--surface-2)',
  '#1f1a16': 'var(--surface-2)',
  '#1f1b17': 'var(--surface-2)',
  '#1a120c': 'var(--surface-2)',
  '#e2d5c5': 'var(--surface-2)',
  '#e7e2da': 'var(--surface-2)',
  '#e5e5e5': 'var(--surface-2)',
  '#ededed': 'var(--surface-2)',
  // borders / dividers
  '#140e0b': 'var(--border)',
  '#211b17': 'var(--border)',
  '#241e1a': 'var(--border)',
  '#241f1a': 'var(--border)',
  '#26211d': 'var(--border)',
  '#281c15': 'var(--border)',
  '#29221b': 'var(--border)',
  '#2b241e': 'var(--border)',
  '#2e2016': 'var(--border)',
  '#2e2620': 'var(--border)',
  '#2f2721': 'var(--border)',
  '#332b24': 'var(--border)',
  '#3d332c': 'var(--border)',
  // brown accent spectrum
  '#c88d51': 'var(--accent)',
  '#dda15e': 'var(--accent-bright)',
  '#9c4e1f': 'var(--accent-deep)',
  '#b45a27': 'var(--accent-deep)',
  '#78350f': 'var(--accent-deep)',
  // brownish text
  '#786152': 'var(--fg-muted)',
  '#736357': 'var(--fg-muted)',
  '#ab9482': 'var(--fg-faint)',
};

// Tailwind text classes -> tokens
const CLASS_MAP: Array<[RegExp, string]> = [
  [/text-white\b/g, 'text-[var(--fg)]'],
  [/text-stone-100\b/g, 'text-[var(--fg)]'],
  [/text-stone-200\b/g, 'text-[var(--fg)]'],
  [/text-stone-300\b/g, 'text-[var(--fg-soft)]'],
  [/text-stone-400\b/g, 'text-[var(--fg-muted)]'],
  [/text-stone-500\b/g, 'text-[var(--fg-faint)]'],
  [/text-stone-600\b/g, 'text-[var(--fg-faint)]'],
  [/hover:bg-white\b/g, 'hover:bg-[var(--surface-2)]'],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(p);
  }
  return out;
}

let touched = 0;

// Semantic colors we must NOT remap
const EXCEPTIONS = new Set(['ffbd2e', 'ff5f56', '27c93f', 'fef08a']);

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/** Bucket a leftover hex into the closest semantic token by hue + luminance. */
function heuristicToken(hex6: string): string | null {
  const [r, g, b] = hexToRgb(hex6);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const lum = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * lum - 1));
  let hue = 0;
  if (d !== 0) {
    const R = r / 255, G = g / 255, B = b / 255;
    if (max === R) hue = ((G - B) / d) % 6;
    else if (max === G) hue = (B - R) / d + 2;
    else hue = (R - G) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }
  if (sat < 0.15) {
    // neutral gray family
    if (lum < 0.1) return 'var(--surface-2)';
    if (lum < 0.3) return 'var(--border)';
    if (lum < 0.6) return 'var(--fg-muted)';
    return 'var(--surface)';
  }
  if (hue >= 10 && hue <= 55) {
    // warm brown / amber family
    if (lum < 0.12) return 'var(--border)';
    if (lum < 0.32) return 'var(--accent-deep)';
    if (lum < 0.55) return 'var(--accent)';
    if (lum < 0.82) return 'var(--accent-bright)';
    return 'var(--surface)';
  }
  return null; // greens, yellows, etc. - leave alone
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const original = readFileSync(file, 'utf8');
    let next = original;
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      next = next.replace(new RegExp(hex, 'gi'), token);
    }
    for (const [re, replacement] of CLASS_MAP) {
      next = next.replace(re, replacement);
    }
    // Pass 2: heuristic bucketing of any remaining 6-digit hexes
    next = next.replace(/#([0-9a-fA-F]{6})\b/g, (m, h) => {
      const key = h.toLowerCase();
      if (EXCEPTIONS.has(key)) return m;
      return heuristicToken(key) || m;
    });
    if (next !== original) {
      writeFileSync(file, next);
      touched++;
      console.log('migrated:', file);
    }
  }
}
console.log(`\nDone. ${touched} file(s) updated.`);

