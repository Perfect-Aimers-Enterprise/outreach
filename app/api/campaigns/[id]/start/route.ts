import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// This route only flips the campaign to ACTIVE and returns
// immediately. It does NOT send any emails itself — that happens
// out-of-band via the cron-triggered /api/queue/process endpoint,
// so the browser is never responsible for keeping a request open.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  if (!user.verified) {
    return NextResponse.json(
      { error: 'Your account is pending manual verification and cannot send email yet.' },
      { status: 403 }
    );
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: user.id },
    include: { attachment: true }
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  if (!campaign.attachmentId || !campaign.attachment) {
    return NextResponse.json(
      { error: 'A CV must be attached to this campaign before it can be started.' },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.resendApiKeyEnc || !dbUser.resendFromEmail) {
    return NextResponse.json(
      { error: 'Add your Resend API key and from-email in Settings before starting a campaign.' },
      { status: 400 }
    );
  }

  const pendingCount = await prisma.campaignContact.count({
    where: { campaignId: params.id, status: 'PENDING' }
  });

  if (pendingCount === 0) {
    return NextResponse.json(
      { error: 'There are no pending contacts to send to.' },
      { status: 400 }
    );
  }

  if (campaign.status === 'ACTIVE') {
    return NextResponse.json({ campaign, alreadyActive: true });
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: { status: 'ACTIVE' }
  });

  return NextResponse.json({ campaign: updated });
}
