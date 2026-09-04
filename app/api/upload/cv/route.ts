import { NextRequest, NextResponse } from 'next/server';
import { isPdfFile, MAX_CV_SIZE_BYTES } from '@/lib/validation';
import { saveAttachment, getLatestAttachment } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No CV file provided.' }, { status: 400 });
    }

    if (!isPdfFile(file)) {
      return NextResponse.json({ error: 'CV must be a PDF file.' }, { status: 400 });
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      return NextResponse.json({ error: 'CV file is too large (max 5MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const attachment = await saveAttachment({
      userId: user.id,
      filename: file.name,
      mimeType: file.type || 'application/pdf',
      buffer
    });

    return NextResponse.json({ attachment });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload CV.' },
      { status: 500 }
    );
  }
}

// Lets the UI offer "reuse previously uploaded CV" without asking
// the user to upload it again every time.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const attachment = await getLatestAttachment(user.id);
  if (!attachment) {
    return NextResponse.json({ attachment: null });
  }
  return NextResponse.json({
    attachment: {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt
    }
  });
}
