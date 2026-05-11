'use client';

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  className = '',
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden
    />
  );
}
