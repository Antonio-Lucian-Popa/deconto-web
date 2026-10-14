'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import { apiBlobUrl } from '@/lib/api-client';
import { toast } from 'sonner';

interface PdfViewerProps {
  /** API path that returns the PDF inline (e.g. /api/reports/:id/view). */
  path: string;
  /** Title shown in the viewer header. */
  title?: string;
  /** Suggested filename used when the user downloads the document. */
  filename?: string;
  onClose: () => void;
}

export function PdfViewer({ path, title = 'Document', filename = 'document.pdf', onClose }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const revokeRef = useRef<() => void>(() => {});

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    let active = true;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    setLoading(true);
    setError(false);
    apiBlobUrl(path)
      .then(({ url, revoke }) => {
        if (!active) {
          revoke();
          return;
        }
        revokeRef.current = revoke;
        setObjectUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      revokeRef.current();
    };
  }, [path, handleKeyDown]);

  function handleDownload() {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
  }

  function handleOpenNewTab() {
    if (!objectUrl) return;
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!opened) toast.error('Permite ferestrele pop-up pentru a deschide documentul.');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/70 backdrop-blur-sm p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FileText size={18} />
            </span>
            <p className="truncate font-semibold text-slate-950">{title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenNewTab}
              disabled={!objectUrl}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40 sm:inline-flex"
              title="Deschide în tab nou"
            >
              <ExternalLink size={16} /> Tab nou
            </button>
            <button
              onClick={handleDownload}
              disabled={!objectUrl}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
              title="Descarcă PDF"
            >
              <Download size={16} /> <span className="hidden sm:inline">Descarcă</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950"
              title="Închide (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1 bg-slate-100">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={30} className="animate-spin text-blue-600" />
              <p className="text-sm">Se încarcă documentul…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
              <AlertCircle size={30} className="text-red-500" />
              <p className="text-sm font-medium text-slate-700">Documentul nu a putut fi încărcat.</p>
              <p className="text-xs">Încearcă să îl descarci sau reîncarcă pagina.</p>
            </div>
          )}
          {objectUrl && !error && (
            <iframe
              src={objectUrl}
              title={title}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
