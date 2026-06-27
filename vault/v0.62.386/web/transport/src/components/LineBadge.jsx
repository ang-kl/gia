import React from 'react';

// Mirrors the JR-style square-letter badge in the Hitachi reference
// (the white "JH" tile in the Yokohama-Line screenshot).
export default function LineBadge({ code, hex, size = 'md' }) {
  const dims = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm';
  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded ${dims}`}
      style={{ background: hex, color: '#fff', fontFamily: 'system-ui' }}
      aria-label={`Line ${code}`}
    >
      {code}
    </span>
  );
}
