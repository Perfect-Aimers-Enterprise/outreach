import { Resend } from 'resend';

// Server-side only. Never import this file from client components.
//
// There is deliberately NO server-wide Resend API key in .env.
// Each user supplies their own key (and from name/email, reply-to)
// via the Settings panel in the UI; it is stored encrypted
// (sec. lib/crypto.ts) against their account and decrypted here,
// in memory, only for the duration of a single send call.

export interface UserResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: {
    filename: string;
    content: string; // base64
  };
}

export async function sendOutreachEmail(params: SendEmailParams, config: UserResendConfig) {
  const { to, subject, html, text, attachment } = params;

  if (!config.apiKey) {
    throw new Error('No Resend API key configured for this account. Add one in Settings.');
  }
  if (!config.fromEmail) {
    throw new Error('No "from" email configured for this account. Add one in Settings.');
  }

  const resend = new Resend(config.apiKey);
  const from = config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail;

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    replyTo: config.replyTo || undefined,
    attachments: attachment
      ? [
          {
            filename: attachment.filename,
            content: attachment.content
          }
        ]
      : undefined
  });

  if (result.error) {
    throw new Error(result.error.message ?? 'Resend failed to send the email.');
  }

  return result.data;
}
