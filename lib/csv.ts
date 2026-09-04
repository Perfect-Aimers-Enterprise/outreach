import { parse } from 'csv-parse/sync';
import { isValidEmail } from './validation';

export interface RawCsvRow {
  organization_name?: string;
  recipient?: string;
  email?: string;
}

export interface ParsedContact {
  rowNumber: number;
  organizationName: string;
  recipient: string;
  email: string;
}

export interface InvalidRow {
  rowNumber: number;
  reason: string;
  raw: Record<string, string>;
}

export interface CsvParseResult {
  valid: ParsedContact[];
  invalid: InvalidRow[];
  duplicates: InvalidRow[];
  total: number;
}

/**
 * Parses the outreach CSV. Expected columns:
 *   organization_name, recipient, email
 *
 * A single bad row never fails the whole upload — it is reported
 * separately in `invalid` or `duplicates`.
 */
export function parseContactsCsv(csvText: string): CsvParseResult {
  let records: Record<string, string>[];

  try {
    records = parse(csvText, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  } catch (err) {
    throw new Error(
      `Could not parse CSV file: ${err instanceof Error ? err.message : 'unknown error'}`
    );
  }

  const valid: ParsedContact[] = [];
  const invalid: InvalidRow[] = [];
  const duplicates: InvalidRow[] = [];
  const seenEmails = new Set<string>();

  records.forEach((raw, idx) => {
    const rowNumber = idx + 2; // +1 for header row, +1 for 1-indexing
    const organizationName = (raw.organization_name ?? '').trim();
    const recipient = (raw.recipient ?? '').trim();
    const email = (raw.email ?? '').trim().toLowerCase();

    if (!email) {
      invalid.push({ rowNumber, reason: 'Missing email address', raw });
      return;
    }

    if (!isValidEmail(email)) {
      invalid.push({ rowNumber, reason: `Invalid email address: "${email}"`, raw });
      return;
    }

    if (seenEmails.has(email)) {
      duplicates.push({ rowNumber, reason: `Duplicate email: "${email}"`, raw });
      return;
    }

    seenEmails.add(email);
    valid.push({ rowNumber, organizationName, recipient, email });
  });

  return {
    valid,
    invalid,
    duplicates,
    total: records.length
  };
}
