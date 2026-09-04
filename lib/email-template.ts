export type OutreachType = 'COMPANY' | 'SCHOOL' | 'CUSTOM';

export interface TemplateVars {
  organizationName: string;
  recipient: string;
  email: string;
}

const PORTFOLIO_URL = 'https://godsave.gokafood.com';
const SIGNATURE_NAME = 'Godsave O. Kawurem';

const COMPANY_SUBJECT = 'Application & Availability - Software/AI Engineer';
const SCHOOL_SUBJECT = 'Part-Time AI/ML Training Programme for Students';

const COMPANY_TEMPLATE = `Dear {{recipient}},

I hope you're doing well.

I\u2019m reaching out to express my interest in opportunities with {{organization_name}}. I am currently completing my NYSC service and expect to conclude in the first week of November 2026.

Following the completion of my service, I will be available to resume work immediately and would be glad to contribute my skills in software development, AI/ML, and full-stack engineering to your team.

I have attached my CV for your consideration. You can also review my portfolio to see some of the projects I have worked on:

Portfolio: ${PORTFOLIO_URL}

I would appreciate the opportunity to discuss any current or upcoming roles that may be a good fit for my background.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${SIGNATURE_NAME}`;

const SCHOOL_TEMPLATE = `Dear {{recipient}},

I hope you're doing well.

I\u2019m reaching out to explore the possibility of offering a part-time Artificial Intelligence and Machine Learning training programme for students at {{organization_name}}.

I am currently completing my NYSC service and will conclude in the first week of November 2026. Following my service, I will be available to conduct practical AI/ML sessions for students on a part-time basis, approximately 2\u20133 times per week.

The programme would introduce students to practical concepts in Artificial Intelligence, Machine Learning, Python programming, and modern AI tools, with a focus on hands-on learning and building real-world projects.

I have attached my CV for your consideration. You can also view my portfolio and some of my previous projects here:

Portfolio: ${PORTFOLIO_URL}

I would be glad to discuss how the programme could be structured to fit the school's schedule and students' level.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${SIGNATURE_NAME}`;

function defaultRecipientFallback(type: OutreachType): string {
  if (type === 'SCHOOL') return 'School Administrator';
  return 'Hiring Manager';
}

function replaceVars(text: string, vars: TemplateVars, type: OutreachType): string {
  const recipient = vars.recipient?.trim() || defaultRecipientFallback(type);
  return text
    .replaceAll('{{organization_name}}', vars.organizationName)
    .replaceAll('{{recipient}}', recipient)
    .replaceAll('{{email}}', vars.email);
}

export function getDefaultSubject(type: OutreachType): string {
  if (type === 'SCHOOL') return SCHOOL_SUBJECT;
  return COMPANY_SUBJECT;
}

export function getDefaultTemplate(type: OutreachType): string {
  if (type === 'SCHOOL') return SCHOOL_TEMPLATE;
  return COMPANY_TEMPLATE;
}

/**
 * Checks whether a rendered string still contains unresolved
 * `{{variable}}` placeholders. Used as a hard safety gate before
 * ever sending an email.
 */
export function hasUnresolvedVariables(text: string): boolean {
  return /{{\s*[\w.]+\s*}}/.test(text);
}

export interface RenderedEmail {
  subject: string;
  body: string;
}

export function renderEmail(params: {
  type: OutreachType;
  customTemplate?: string | null;
  customSubject?: string | null;
  vars: TemplateVars;
}): RenderedEmail {
  const { type, customTemplate, customSubject, vars } = params;

  const templateSource =
    customTemplate && customTemplate.trim().length > 0
      ? customTemplate
      : getDefaultTemplate(type === 'CUSTOM' ? 'COMPANY' : type);

  const subjectSource =
    customSubject && customSubject.trim().length > 0
      ? customSubject
      : getDefaultSubject(type === 'CUSTOM' ? 'COMPANY' : type);

  const body = replaceVars(templateSource, vars, type);
  const subject = replaceVars(subjectSource, vars, type);

  return { subject, body };
}

/** Converts a plain-text email body into a minimal safe HTML version. */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;white-space:pre-wrap;line-height:1.5;">${escaped}</div>`;
}
