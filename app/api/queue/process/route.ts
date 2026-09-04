import { NextRequest, NextResponse } from 'next/server';
import { processAllActiveCampaigns } from '@/lib/queue';

// This is the ONLY place emails actually get sent. It is triggered
// either by Vercel Cron (configured in vercel.json) or an external
// scheduler (e.g. cron-job.org) hitting this URL periodically.
// Each invocation processes exactly one batch per active campaign
// and returns — it never keeps a connection open, so it works fine
// as a short-lived serverless function and keeps working even if
// the browser that started the campaign is long closed.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (e.g. local dev)

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  // Vercel Cron sends this header automatically on Vercel-managed crons.
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  if (vercelCronHeader) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const results = await processAllActiveCampaigns();
  return NextResponse.json({ results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
