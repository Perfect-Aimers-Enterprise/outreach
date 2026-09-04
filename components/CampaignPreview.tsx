'use client';

import { useEffect, useState } from 'react';
import { ParsedContact } from './CsvUploader';
import { OutreachType } from './TemplateEditor';

export default function CampaignPreview({
  contacts,
  type,
  useCustom,
  customTemplate,
  customSubject,
  cvFilename
}: {
  contacts: ParsedContact[];
  type: OutreachType;
  useCustom: boolean;
  customTemplate: string;
  customSubject: string;
  cvFilename: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [rendered, setRendered] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contact = contacts[index];

  useEffect(() => {
    if (!contact) {
      setRendered(null);
      return;
    }
    const controller = new AbortController();
    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        organizationName: contact.organizationName,
        recipient: contact.recipient,
        email: contact.email,
        type: useCustom ? 'CUSTOM' : type,
        customTemplate: useCustom ? customTemplate : undefined,
        customSubject: useCustom ? customSubject : undefined
      })
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRendered(null);
        } else {
          setError(null);
          setRendered(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [contact, type, useCustom, customTemplate, customSubject]);

  if (contacts.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold mb-1">5. Preview</h2>
        <p className="text-sm text-slate-400">Upload a CSV to preview emails.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">5. Preview</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            className="btn-secondary px-2 py-1"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Prev
          </button>
          <span className="text-slate-500">
            {index + 1} / {contacts.length}
          </span>
          <button
            className="btn-secondary px-2 py-1"
            disabled={index === contacts.length - 1}
            onClick={() => setIndex((i) => Math.min(contacts.length - 1, i + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {rendered && (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">To:</span> {contact.email}
          </p>
          <p>
            <span className="font-medium">Subject:</span> {rendered.subject}
          </p>
          <div className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap max-h-64 overflow-auto">
            {rendered.body}
          </div>
          <p>
            <span className="font-medium">Attachment:</span>{' '}
            {cvFilename ?? <span className="text-amber-600">No CV uploaded yet</span>}
          </p>
        </div>
      )}
    </div>
  );
}
