'use client';

export interface QueueSettings {
  batchSize: number;
  delayBetweenBatchesMs: number;
  maxRetries: number;
}

export default function QueueControls({
  settings,
  onSettingsChange,
  disabled,
  campaignStatus,
  onStart,
  onPause,
  onResume,
  starting
}: {
  settings: QueueSettings;
  onSettingsChange: (s: QueueSettings) => void;
  disabled: boolean;
  campaignStatus?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  starting: boolean;
}) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1">6. Sending queue</h2>
      <p className="text-xs text-slate-500 mb-3">
        Conservative defaults. Emails are sent in small batches with a delay in between — never all at
        once.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="label">Emails per batch</label>
          <input
            type="number"
            min={1}
            max={50}
            className="input"
            value={settings.batchSize}
            onChange={(e) => onSettingsChange({ ...settings, batchSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Delay (seconds)</label>
          <input
            type="number"
            min={5}
            className="input"
            value={Math.round(settings.delayBetweenBatchesMs / 1000)}
            onChange={(e) =>
              onSettingsChange({ ...settings, delayBetweenBatchesMs: Number(e.target.value) * 1000 })
            }
          />
        </div>
        <div>
          <label className="label">Max retries</label>
          <input
            type="number"
            min={1}
            max={10}
            className="input"
            value={settings.maxRetries}
            onChange={(e) => onSettingsChange({ ...settings, maxRetries: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {(!campaignStatus || campaignStatus === 'DRAFT') && (
          <button className="btn-primary" onClick={onStart} disabled={disabled || starting}>
            {starting ? 'Starting...' : 'Start campaign'}
          </button>
        )}
        {campaignStatus === 'ACTIVE' && (
          <button className="btn-secondary" onClick={onPause}>
            Pause
          </button>
        )}
        {campaignStatus === 'PAUSED' && (
          <button className="btn-primary" onClick={onResume}>
            Resume
          </button>
        )}
        {campaignStatus === 'COMPLETED' && <span className="text-sm text-green-600 self-center">Campaign completed.</span>}
      </div>
    </div>
  );
}
