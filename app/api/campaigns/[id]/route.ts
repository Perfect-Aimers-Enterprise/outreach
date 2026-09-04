import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status'); // ALL | PENDING | SENT | FAILED | ...

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: user.id },
    include: { attachment: { select: { id: true, filename: true, size: true } } }
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  const contacts = await prisma.campaignContact.findMany({
    where: {
      campaignId: params.id,
      ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {})
    },
    orderBy: { createdAt: 'asc' }
  });

  const [sent, failed, pending, processing, cancelled, needsAttention, total] = await Promise.all([
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'SENT' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'FAILED' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'PENDING' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'PROCESSING' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'CANCELLED' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id, status: 'NEEDS_ATTENTION' } }),
    prisma.campaignContact.count({ where: { campaignId: params.id } })
  ]);

  return NextResponse.json({
    campaign,
    contacts,
    stats: { total, sent, failed, pending, processing, cancelled, needsAttention }
  });
}
