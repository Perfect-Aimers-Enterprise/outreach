'use client';

import { useState } from 'react';

export interface ContactRow {
  id: string;
  organizationName: string;
  recipient: string | null;
  email: string;
  status: string;
  attempts: number;
  lastError: string | null;
}

const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'NEEDS_ATTENTION'] as const;

const statusColors: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  NEEDS_ATTENTION: 'bg-amber-100 text-amber-700'
};

export default function ContactTable({
  contacts,
  onRetry,
  onCancel
}: {
  contacts: ContactRow[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const filtered = filter === 'ALL' ? contacts : contacts.filter((c) => c.status === filter);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold">Contacts</h2>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-3">Organization</th>
              <th className="py-2 pr-3">Recipient</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Attempts</th>
              <th className="py-2 pr-3">Error</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 pr-3">{c.organizationName || <em className="text-amber-600">missing</em>}</td>
                <td className="py-2 pr-3">{c.recipient || '\u2014'}</td>
                <td className="py-2 pr-3">{c.email}</td>
                <td className="py-2 pr-3">
                  <span className={`badge ${statusColors[c.status] ?? ''}`}>{c.status}</span>
                </td>
                <td className="py-2 pr-3">{c.attempts}</td>
                <td className="py-2 pr-3 max-w-xs truncate text-red-600">{c.lastError ?? ''}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {c.status === 'FAILED' && (
                    <button className="text-brand-600 text-xs hover:underline" onClick={() => onRetry(c.id)}>
                      Retry
                    </button>
                  )}
                  {c.status === 'PENDING' && (
                    <button className="text-red-600 text-xs hover:underline" onClick={() => onCancel(c.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  No contacts in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
