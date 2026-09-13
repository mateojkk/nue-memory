'use client';

import React from 'react';
import Image from 'next/image';

interface NueLogoProps {
  className?: string;
  size?: number; // target height in pixels
  showText?: boolean;
  textSize?: string;
}

export function NueLogo({
  className = '',
  size = 24,
  showText = true,
  textSize = 'text-xl',
}: NueLogoProps) {
  // 213x155 is ~1.374 aspect ratio
  const width = Math.round(size * (213 / 155));

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width, height: size }}
      >
        <Image
          src="/logo-transparent.png"
          alt="Nue Logo"
          width={213}
          height={155}
          className="w-full h-full object-contain [image-rendering:pixelated]"
          priority
        />
      </div>
      {showText && (
        <span className={`${textSize} font-medium tracking-tight text-white font-sans`}>
          Nue
        </span>
      )}
    </div>
  );
}
