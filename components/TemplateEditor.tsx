'use client';

export type OutreachType = 'COMPANY' | 'SCHOOL' | 'CUSTOM';

export default function TemplateEditor({
  type,
  onTypeChange,
  useCustom,
  onUseCustomChange,
  customTemplate,
  onCustomTemplateChange,
  customSubject,
  onCustomSubjectChange
}: {
  type: OutreachType;
  onTypeChange: (t: OutreachType) => void;
  useCustom: boolean;
  onUseCustomChange: (v: boolean) => void;
  customTemplate: string;
  onCustomTemplateChange: (v: string) => void;
  customSubject: string;
  onCustomSubjectChange: (v: string) => void;
}) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1">3. Message</h2>
      <p className="text-xs text-slate-500 mb-3">
        Variables: <code>{'{{organization_name}}'}</code> <code>{'{{recipient}}'}</code>{' '}
        <code>{'{{email}}'}</code>
      </p>

      <div className="flex gap-2 mb-4">
        <button
          className={useCustom ? 'btn-secondary' : 'btn-primary'}
          onClick={() => onUseCustomChange(false)}
        >
          Use built-in template
        </button>
        <button
          className={useCustom ? 'btn-primary' : 'btn-secondary'}
          onClick={() => onUseCustomChange(true)}
        >
          Write custom message
        </button>
      </div>

      {!useCustom && (
        <div className="mb-3">
          <label className="label">Outreach type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={type === 'COMPANY'}
                onChange={() => onTypeChange('COMPANY')}
              />
              Company
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={type === 'SCHOOL'}
                onChange={() => onTypeChange('SCHOOL')}
              />
              Secondary School
            </label>
          </div>
        </div>
      )}

      {useCustom && (
        <div className="space-y-3">
          <div>
            <label className="label">Custom subject (optional)</label>
            <input
              className="input"
              placeholder="Leave blank to use the default subject"
              value={customSubject}
              onChange={(e) => onCustomSubjectChange(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Custom message</label>
            <textarea
              className="input"
              rows={10}
              placeholder="Dear {{recipient}}, ..."
              value={customTemplate}
              onChange={(e) => onCustomTemplateChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
