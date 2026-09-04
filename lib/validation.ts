const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

export const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function isPdfFile(file: File): boolean {
  const nameOk = file.name.toLowerCase().endsWith('.pdf');
  const typeOk = file.type === 'application/pdf' || file.type === '';
  return nameOk && typeOk;
}

/**
 * Very small sanitizer for user-supplied template text.
 * We only ever render templates as plain text -> converted to a
 * minimal HTML wrapper, so this strips characters that could be
 * used to break out of that context. It intentionally does NOT try
 * to allow any HTML tags from the user.
 */
export function sanitizeTemplateInput(input: string): string {
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
