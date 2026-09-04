import { NextRequest, NextResponse } from 'next/server';
import { parseContactsCsv } from '@/lib/csv';
import { MAX_CSV_SIZE_BYTES } from '@/lib/validation';
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
      return NextResponse.json({ error: 'No CSV file provided.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a .csv file.' }, { status: 400 });
    }

    if (file.size > MAX_CSV_SIZE_BYTES) {
      return NextResponse.json({ error: 'CSV file is too large (max 2MB).' }, { status: 400 });
    }

    const text = await file.text();
    const result = parseContactsCsv(text);

    return NextResponse.json({
      total: result.total,
      validCount: result.valid.length,
      invalidCount: result.invalid.length,
      duplicateCount: result.duplicates.length,
      valid: result.valid,
      invalid: result.invalid,
      duplicates: result.duplicates
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse CSV.' },
      { status: 400 }
    );
  }
}
