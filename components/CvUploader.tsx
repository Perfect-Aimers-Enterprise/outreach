'use client';

import { useEffect, useRef, useState } from 'react';

export interface CvAttachment {
  id: string;
  filename: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CvUploader({ onSelected }: { onSelected: (att: CvAttachment | null) => void }) {
  const [attachment, setAttachment] = useState<CvAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Offer to reuse the most recently uploaded CV so the user
    // doesn't have to upload it again every campaign.
    fetch('/api/upload/cv')
      .then((r) => r.json())
      .then((data) => {
        if (data.attachment) {
          setAttachment(data.attachment);
          onSelected(data.attachment);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/cv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to upload CV.');
        return;
      }
      setAttachment(data.attachment);
      onSelected(data.attachment);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1">2. Upload your CV (PDF)</h2>
      <p className="text-xs text-slate-500 mb-3">Attached to every outgoing email.</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {attachment && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="truncate">{attachment.filename}</span>
          <span className="text-slate-400 text-xs">{formatBytes(attachment.size)}</span>
        </div>
      )}

      <button className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? 'Uploading...' : attachment ? 'Upload a different CV' : 'Choose PDF file'}
      </button>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
