import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { renderEmail, OutreachType, hasUnresolvedVariables } from '@/lib/email-template';
import { sanitizeTemplateInput, isValidEmail } from '@/lib/validation';
import { getSessionUser } from '@/lib/auth';

interface IncomingContact {
  organizationName: string;
  recipient: string;
  email: string;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { contacts: true } },
      attachment: { select: { filename: true } }
    }
  });

  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const [sent, failed, pending, needsAttention] = await Promise.all([
        prisma.campaignContact.count({ where: { campaignId: c.id, status: 'SENT' } }),
        prisma.campaignContact.count({ where: { campaignId: c.id, status: 'FAILED' } }),
        prisma.campaignContact.count({ where: { campaignId: c.id, status: 'PENDING' } }),
        prisma.campaignContact.count({ where: { campaignId: c.id, status: 'NEEDS_ATTENTION' } })
      ]);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        createdAt: c.createdAt,
        cvFilename: c.attachment?.filename ?? null,
        total: c._count.contacts,
        sent,
        failed,
        pending,
        needsAttention
      };
    })
  );

  return NextResponse.json({ campaigns: withStats });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      type,
      customTemplate,
      customSubject,
      attachmentId,
      contacts,
      batchSize,
      delayBetweenBatchesMs,
      maxRetries
    }: {
      name: string;
      type: OutreachType;
      customTemplate?: string;
      customSubject?: string;
      attachmentId?: string;
      contacts: IncomingContact[];
      batchSize?: number;
      delayBetweenBatchesMs?: number;
      maxRetries?: number;
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
    }
    if (!type || !['COMPANY', 'SCHOOL', 'CUSTOM'].includes(type)) {
      return NextResponse.json({ error: 'A valid outreach type is required.' }, { status: 400 });
    }
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'At least one valid contact is required.' }, { status: 400 });
    }
    if (type === 'CUSTOM' && (!customTemplate || !customTemplate.trim())) {
      return NextResponse.json({ error: 'Custom template text is required for a custom campaign.' }, { status: 400 });
    }

    // Basic accidental-double-submit guard: if an identical campaign
    // (same name) was created in the last 10 seconds, return it
    // instead of creating a duplicate.
    const recentDuplicate = await prisma.campaign.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
        createdAt: { gte: new Date(Date.now() - 10_000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (recentDuplicate) {
      return NextResponse.json({ campaign: recentDuplicate, deduped: true });
    }

    // Make sure the attachment (if any) actually belongs to this user.
    let ownedAttachmentId: string | undefined = undefined;
    if (attachmentId) {
      const owned = await prisma.attachment.findFirst({ where: { id: attachmentId, userId: user.id } });
      if (!owned) {
        return NextResponse.json({ error: 'CV attachment not found for this account.' }, { status: 400 });
      }
      ownedAttachmentId = owned.id;
    }

    const cleanCustomTemplate = customTemplate ? sanitizeTemplateInput(customTemplate) : undefined;
    const cleanCustomSubject = customSubject ? sanitizeTemplateInput(customSubject) : undefined;

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type,
        customTemplate: cleanCustomTemplate,
        customSubject: cleanCustomSubject,
        attachmentId: ownedAttachmentId,
        batchSize: batchSize && batchSize > 0 ? Math.min(batchSize, 50) : 5,
        delayBetweenBatchesMs:
          delayBetweenBatchesMs && delayBetweenBatchesMs > 0 ? delayBetweenBatchesMs : 60_000,
        maxRetries: maxRetries && maxRetries > 0 ? Math.min(maxRetries, 10) : 3
      }
    });

    const contactRows = contacts
      .filter((c) => isValidEmail(c.email))
      .map((c) => {
        const organizationName = (c.organizationName ?? '').trim();
        const recipient = (c.recipient ?? '').trim();
        const email = c.email.trim().toLowerCase();

        // Organization name missing -> flag for manual attention
        // rather than sending an under-personalized email.
        if (!organizationName) {
          return {
            campaignId: campaign.id,
            organizationName: '',
            recipient,
            email,
            subject: '',
            body: '',
            status: 'NEEDS_ATTENTION' as const
          };
        }

        const rendered = renderEmail({
          type,
          customTemplate: cleanCustomTemplate,
          customSubject: cleanCustomSubject,
          vars: { organizationName, recipient, email }
        });

        const unresolved = hasUnresolvedVariables(rendered.subject) || hasUnresolvedVariables(rendered.body);

        return {
          campaignId: campaign.id,
          organizationName,
          recipient,
          email,
          subject: rendered.subject,
          body: rendered.body,
          status: unresolved ? ('NEEDS_ATTENTION' as const) : ('PENDING' as const)
        };
      });

    await prisma.campaignContact.createMany({ data: contactRows });

    const created = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { contacts: true, attachment: true }
    });

    return NextResponse.json({ campaign: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create campaign.' },
      { status: 500 }
    );
  }
}
