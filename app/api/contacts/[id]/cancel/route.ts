import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const contact = await prisma.campaignContact.findFirst({
    where: { id: params.id, campaign: { userId: user.id } }
  });

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  }

  if (contact.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending contacts can be cancelled.' }, { status: 400 });
  }

  const updated = await prisma.campaignContact.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' }
  });

  return NextResponse.json({ contact: updated });
}
