'use client';

import { useRef, useState } from 'react';

export interface ParsedContact {
  rowNumber: number;
  organizationName: string;
  recipient: string;
  email: string;
}

export interface CsvParseSummary {
  total: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  valid: ParsedContact[];
  invalid: { rowNumber: number; reason: string }[];
  duplicates: { rowNumber: number; reason: string }[];
}

export default function CsvUploader({
  onParsed
}: {
  onParsed: (summary: CsvParseSummary | null) => void;
}) {
  const [summary, setSummary] = useState<CsvParseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to parse CSV.');
        setSummary(null);
        onParsed(null);
        return;
      }
      setSummary(data);
      setFilename(file.name);
      onParsed(data);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1">1. Upload contacts (CSV)</h2>
      <p className="text-xs text-slate-500 mb-3">
        Columns: <code>organization_name, recipient, email</code>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? 'Uploading...' : filename ? `Change file (${filename})` : 'Choose CSV file'}
      </button>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {summary && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-lg font-semibold text-green-700">{summary.validCount}</p>
            <p className="text-xs text-green-700">Valid</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-lg font-semibold text-amber-700">{summary.invalidCount}</p>
            <p className="text-xs text-amber-700">Invalid</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-lg font-semibold text-slate-700">{summary.duplicateCount}</p>
            <p className="text-xs text-slate-700">Duplicates</p>
          </div>
        </div>
      )}

      {summary && (summary.invalid.length > 0 || summary.duplicates.length > 0) && (
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer">View rows that were skipped</summary>
          <ul className="mt-2 space-y-1 max-h-32 overflow-auto">
            {[...summary.invalid, ...summary.duplicates].map((row, i) => (
              <li key={i}>
                Row {row.rowNumber}: {row.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
