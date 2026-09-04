import { NextRequest, NextResponse } from 'next/server';
import { renderEmail, OutreachType } from '@/lib/email-template';
import { sanitizeTemplateInput } from '@/lib/validation';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      organizationName = '',
      recipient = '',
      email = '',
      type,
      customTemplate,
      customSubject
    }: {
      organizationName: string;
      recipient: string;
      email: string;
      type: OutreachType;
      customTemplate?: string;
      customSubject?: string;
    } = body;

    if (!type || !['COMPANY', 'SCHOOL', 'CUSTOM'].includes(type)) {
      return NextResponse.json({ error: 'A valid outreach type is required.' }, { status: 400 });
    }

    const rendered = renderEmail({
      type,
      customTemplate: customTemplate ? sanitizeTemplateInput(customTemplate) : undefined,
      customSubject: customSubject ? sanitizeTemplateInput(customSubject) : undefined,
      vars: { organizationName, recipient, email }
    });

    return NextResponse.json(rendered);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate preview.' },
      { status: 400 }
    );
  }
}
