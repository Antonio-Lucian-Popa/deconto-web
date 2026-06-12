'use client';

import { useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState } from 'react';

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Micșorează"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Mărește"
        >
          <ZoomIn size={18} />
        </button>
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Descarcă"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Închide (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? 'Bon'}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
          className="rounded max-w-none"
        />
      </div>
    </div>
  );
}
