'use client';

import React from 'react';
import Image from 'next/image';

interface NueLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export function NueLogo({
  className = '',
  size = 28,
  showText = true,
  textSize = 'text-xl',
}: NueLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative overflow-hidden rounded-md border border-[#2e2620] bg-[#141210] shrink-0 shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.jpg"
          alt="Nue Logo"
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-cover"
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
