'use client';

// Runs only in the browser. Keeps the Settings form pre-filled
// across visits without re-hitting the server. The actual sending
// credentials always live server-side (encrypted) against the
// user's account — this is just a convenience cache, so it uses a
// light base64 encoding (sec. "no real secrecy from localStorage",
// just avoids leaving the key sitting around in plain text).

const STORAGE_KEY = 'outreach_resend_settings_v1';

export interface LocalResendSettings {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
}

function encode(value: string): string {
  if (typeof window === 'undefined') return '';
  return window.btoa(unescape(encodeURIComponent(value)));
}

function decode(value: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return decodeURIComponent(escape(window.atob(value)));
  } catch {
    return '';
  }
}

export function loadLocalResendSettings(): LocalResendSettings {
  if (typeof window === 'undefined') {
    return { apiKey: '', fromEmail: '', fromName: '', replyTo: '' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: '', fromEmail: '', fromName: '', replyTo: '' };
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey ? decode(parsed.apiKey) : '',
      fromEmail: parsed.fromEmail ?? '',
      fromName: parsed.fromName ?? '',
      replyTo: parsed.replyTo ?? ''
    };
  } catch {
    return { apiKey: '', fromEmail: '', fromName: '', replyTo: '' };
  }
}

export function saveLocalResendSettings(settings: LocalResendSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: settings.apiKey ? encode(settings.apiKey) : '',
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      replyTo: settings.replyTo
    })
  );
}
