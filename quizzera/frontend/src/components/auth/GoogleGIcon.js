'use client';

import Image from 'next/image';
import googleMark from '@/icons/google.png';

export function GoogleGIcon({ size = 20, className = '' }) {
  return (
    <Image
      src={googleMark}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden
    />
  );
}
