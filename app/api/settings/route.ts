import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { encodeSecret, maskSecret } from "@/lib/crypto";
import { isValidEmail } from "@/lib/validation";

// Nothing here is ever written to server .env — each user brings
// their own Resend API key from the UI. The key is encrypted
// (sec. lib/crypto.ts) before it touches the database and is only
// decrypted in-memory right before the call to Resend.

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({
    settings: {
      hasApiKey: Boolean(user.resendApiKeyEnc),
      apiKeyPreview: user.resendApiKeyEnc ? maskSecret(user.resendApiKeyEnc) : null,
      fromEmail: user.resendFromEmail,
      fromName: user.resendFromName,
      replyTo: user.resendReplyTo,
    },
  });
}

export async function PUT(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { apiKey, fromEmail, fromName, replyTo } = await req.json();

    // if (fromEmail && !isValidEmail(fromEmail)) {
    //   return NextResponse.json({ error: 'From email must be a valid email address.' }, { status: 400 });
    // }
    if (replyTo && !isValidEmail(replyTo)) {
      return NextResponse.json(
        { error: "Reply-to must be a valid email address." },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (typeof fromEmail === "string") updateData.resendFromEmail = fromEmail.trim() || null;
    if (typeof fromName === "string") updateData.resendFromName = fromName.trim() || null;
    if (typeof replyTo === "string") updateData.resendReplyTo = replyTo.trim() || null;
    // Only overwrite the stored key if the user actually typed a
    // new one — an empty string means "leave the existing key alone".
    if (typeof apiKey === "string" && apiKey.trim().length > 0) {
      updateData.resendApiKeyEnc = encodeSecret(apiKey.trim());
    }

    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
    });

    return NextResponse.json({
      settings: {
        hasApiKey: Boolean(user.resendApiKeyEnc),
        apiKeyPreview: user.resendApiKeyEnc ? maskSecret(user.resendApiKeyEnc) : null,
        fromEmail: user.resendFromEmail,
        fromName: user.resendFromName,
        replyTo: user.resendReplyTo,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings." },
      { status: 500 },
    );
  }
}
