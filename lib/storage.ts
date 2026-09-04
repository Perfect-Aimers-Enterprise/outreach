import { prisma } from './db';

/**
 * Storage abstraction for the CV (and any future) attachments.
 *
 * Current implementation: base64 content stored in Postgres via the
 * `Attachment` model, scoped per user. This is deliberately chosen
 * over local disk because serverless platforms like Vercel do not
 * guarantee a writable, persistent filesystem between invocations.
 * A CV PDF is small (limited to 5MB), so storing it as base64 in
 * the database is a reasonable trade-off for the MVP.
 *
 * To move to S3-compatible storage later (sec. README): keep this
 * same interface (saveAttachment / getAttachmentById), but have
 * `data` hold an object key instead of base64 content, and fetch
 * bytes from the bucket instead. No other code depends on the
 * storage mechanism.
 */

export interface SavedAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export async function saveAttachment(params: {
  userId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<SavedAttachment> {
  const { userId, filename, mimeType, buffer } = params;

  const attachment = await prisma.attachment.create({
    data: {
      userId,
      filename,
      mimeType,
      size: buffer.length,
      data: buffer.toString('base64')
    }
  });

  return {
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size
  };
}

export async function getLatestAttachment(userId: string) {
  return prisma.attachment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getAttachmentById(id: string, userId: string) {
  return prisma.attachment.findFirst({ where: { id, userId } });
}
