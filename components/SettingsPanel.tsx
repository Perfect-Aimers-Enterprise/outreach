'use client';

import { useEffect, useState } from 'react';
import { loadLocalResendSettings, saveLocalResendSettings } from '@/lib/local-settings';

interface RemoteSettings {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
}

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [remote, setRemote] = useState<RemoteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const local = loadLocalResendSettings();
    setApiKey(local.apiKey);
    setFromEmail(local.fromEmail);
    setFromName(local.fromName);
    setReplyTo(local.replyTo);

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setRemote(data.settings);
          if (!local.fromEmail && data.settings.fromEmail) setFromEmail(data.settings.fromEmail);
          if (!local.fromName && data.settings.fromName) setFromName(data.settings.fromName);
          if (!local.replyTo && data.settings.replyTo) setReplyTo(data.settings.replyTo);
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      saveLocalResendSettings({ apiKey, fromEmail, fromName, replyTo });

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, fromEmail, fromName, replyTo })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save settings.');
        return;
      }
      setRemote(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <div>
          <h2 className="font-semibold">Resend settings</h2>
          <p className="text-xs text-slate-500">
            {remote?.hasApiKey ? `Key saved (${remote.apiKeyPreview})` : 'No API key saved yet'} — bring
            your own Resend account.
          </p>
        </div>
        <span className="text-slate-400">{open ? '\u2212' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Your Resend API key is stored encrypted on the server against your account, and cached
            (lightly encoded) in this browser's local storage so you don't have to retype it. It is
            never exposed to other users and is decoded only right before an email is sent.
          </p>
          <div>
            <label className="label">Resend API key</label>
            <input
              type="password"
              className="input"
              placeholder="re_xxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="label">From email</label>
            <input
              type="email"
              className="input"
              placeholder="you@yourdomain.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">From name</label>
            <input
              className="input"
              placeholder="Your Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Reply-to email</label>
            <input
              type="email"
              className="input"
              placeholder="you@gmail.com"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Saved.</p>}

          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      )}
    </div>
  );
}
