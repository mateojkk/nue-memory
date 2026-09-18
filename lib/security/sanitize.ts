/**
 * Security Sanitization & Validation Utility
 * Validates payloads, raster image data, and string lengths to prevent injections and memory exhaustion.
 */

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_BASE64_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB base64 cap

export interface ValidationResult<T = any> {
  valid: boolean;
  error?: string;
  sanitized?: T;
}

/**
 * Validates an email address format
 */
export function validateEmail(email: unknown): ValidationResult<string> {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email must be a non-empty string' };
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return { valid: false, error: 'Invalid email address format' };
  }
  return { valid: true, sanitized: trimmed };
}

/**
 * Validates and sanitizes a text input (e.g. prompt, brief, title)
 */
export function sanitizeText(
  input: unknown,
  maxLength = 1000,
  fieldName = 'Field'
): ValidationResult<string> {
  if (typeof input !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  // Strip control characters (excluding newline and tab)
  const cleaned = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (cleaned.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum permitted length of ${maxLength} characters`,
    };
  }
  return { valid: true, sanitized: cleaned };
}

/**
 * Validates an image source (data URL or public HTTPS URL).
 * Strictly forbids SVG, XML, HTML, and executable payloads.
 */
export function validateImageSource(imageSource: unknown): ValidationResult<string> {
  if (typeof imageSource !== 'string' || !imageSource.trim()) {
    return { valid: false, error: 'Image source must be a non-empty string' };
  }

  const src = imageSource.trim();

  // If public HTTP/HTTPS URL
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const parsed = new URL(src);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'Only HTTP and HTTPS image URLs are permitted' };
      }
      return { valid: true, sanitized: src };
    } catch {
      return { valid: false, error: 'Malformed image URL' };
    }
  }

  // If base64 data URL
  if (src.startsWith('data:')) {
    if (src.length > MAX_BASE64_IMAGE_BYTES) {
      return {
        valid: false,
        error: `Attached image exceeds the maximum allowed size (${Math.round(MAX_BASE64_IMAGE_BYTES / 1024 / 1024)}MB)`,
      };
    }

    const match = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { valid: false, error: 'Malformed base64 image data URL' };
    }

    const mimeType = match[1].toLowerCase().trim();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return {
        valid: false,
        error: `Unsupported image format (${mimeType}). Only raster images (JPEG, PNG, WebP, GIF, AVIF) are allowed. Vector/SVG formats are blocked for security.`,
      };
    }

    // Basic base64 character check
    const base64Data = match[2];
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.slice(0, 1000))) {
      return { valid: false, error: 'Corrupted base64 payload' };
    }

    return { valid: true, sanitized: src };
  }

  return { valid: false, error: 'Invalid image format: must be an HTTPS URL or base64 data URI' };
}
