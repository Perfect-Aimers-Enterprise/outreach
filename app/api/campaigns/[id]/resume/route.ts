import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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

  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, userId: user.id } });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  if (campaign.status !== 'PAUSED') {
    return NextResponse.json({ error: 'Only a paused campaign can be resumed.' }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: { status: 'ACTIVE' }
  });

  return NextResponse.json({ campaign: updated });
}
