import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, userId: user.id } });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  if (campaign.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Only an active campaign can be paused.' }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: { status: 'PAUSED' }
  });

  return NextResponse.json({ campaign: updated });
}
