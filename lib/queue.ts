import { prisma } from './db';
import { sendOutreachEmail } from './resend';
import { textToHtml, hasUnresolvedVariables } from './email-template';
import { decodeSecret } from './crypto';

/** Exponential backoff, in milliseconds, before the next retry attempt. */
function backoffMs(attempt: number): number {
  const base = 60_000; // 1 minute
  return base * Math.pow(2, attempt - 1); // 1m, 2m, 4m, ...
}

export interface ProcessResult {
  campaignId: string;
  processed: number;
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
}

/**
 * Processes a single batch for a single ACTIVE campaign. Designed
 * to run inside one short-lived serverless invocation — it never
 * loops until the whole campaign is done, only one batch per call.
 */
export async function processCampaignBatch(campaignId: string): Promise<ProcessResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { attachment: true, user: true }
  });

  if (!campaign) {
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'not found' };
  }

  if (campaign.status !== 'ACTIVE') {
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: `status is ${campaign.status}` };
  }

  // Manual-verification gate: unverified accounts can build and
  // preview campaigns, but nothing actually sends until the app
  // owner flips `verified` to true for that account (sec. README).
  if (!campaign.user.verified) {
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'account not verified' };
  }

  const resendApiKeyEnc = campaign.user.resendApiKeyEnc;
  const resendFromEmail = campaign.user.resendFromEmail;
  if (!resendApiKeyEnc || !resendFromEmail) {
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'Resend settings not configured' };
  }

  // Respect the configured delay between batches even if the cron
  // trigger fires more often than that.
  if (campaign.lastBatchAt) {
    const elapsed = Date.now() - campaign.lastBatchAt.getTime();
    if (elapsed < campaign.delayBetweenBatchesMs) {
      return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'waiting for batch delay' };
    }
  }

  if (!campaign.attachment) {
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'no CV attachment configured' };
  }

  const now = new Date();

  const batch = await prisma.campaignContact.findMany({
    where: {
      campaignId,
      status: 'PENDING',
      scheduledAt: { lte: now }
    },
    orderBy: { createdAt: 'asc' },
    take: campaign.batchSize
  });

  if (batch.length === 0) {
    await finalizeCampaignIfDone(campaignId);
    return { campaignId, processed: 0, sent: 0, failed: 0, skipped: true, reason: 'no pending contacts due' };
  }

  await prisma.campaignContact.updateMany({
    where: { id: { in: batch.map((c) => c.id) } },
    data: { status: 'PROCESSING' }
  });

  const attachmentRecord = campaign.attachment;
  const resendConfig = {
    apiKey: decodeSecret(resendApiKeyEnc),
    fromEmail: resendFromEmail,
    fromName: campaign.user.resendFromName,
    replyTo: campaign.user.resendReplyTo
  };

  let sent = 0;
  let failed = 0;

  for (const contact of batch) {
    try {
      if (hasUnresolvedVariables(contact.subject) || hasUnresolvedVariables(contact.body)) {
        throw new Error('Email contains unresolved template variables');
      }

      await sendOutreachEmail(
        {
          to: contact.email,
          subject: contact.subject,
          html: textToHtml(contact.body),
          text: contact.body,
          attachment: {
            filename: attachmentRecord.filename,
            content: attachmentRecord.data
          }
        },
        resendConfig
      );

      await prisma.campaignContact.update({
        where: { id: contact.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: contact.attempts + 1, lastError: null }
      });
      sent += 1;
    } catch (err) {
      const attempts = contact.attempts + 1;
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (attempts >= campaign.maxRetries) {
        await prisma.campaignContact.update({
          where: { id: contact.id },
          data: { status: 'FAILED', attempts, lastError: message }
        });
      } else {
        await prisma.campaignContact.update({
          where: { id: contact.id },
          data: {
            status: 'PENDING',
            attempts,
            lastError: message,
            scheduledAt: new Date(Date.now() + backoffMs(attempts))
          }
        });
      }
      failed += 1;
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { lastBatchAt: new Date() }
  });

  await finalizeCampaignIfDone(campaignId);

  return { campaignId, processed: batch.length, sent, failed, skipped: false };
}

async function finalizeCampaignIfDone(campaignId: string) {
  const remaining = await prisma.campaignContact.count({
    where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } }
  });

  if (remaining === 0) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' }
    });
  }
}

/** Processes one batch for every currently ACTIVE campaign. Used by the cron endpoint. */
export async function processAllActiveCampaigns(): Promise<ProcessResult[]> {
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });

  const results: ProcessResult[] = [];
  for (const c of activeCampaigns) {
    results.push(await processCampaignBatch(c.id));
  }
  return results;
}
