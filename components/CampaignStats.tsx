'use client';

export interface Stats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  processing: number;
  cancelled: number;
  needsAttention: number;
}

export default function CampaignStats({ name, status, stats }: { name: string; status: string; stats: Stats }) {
  const done = stats.sent + stats.failed + stats.cancelled;
  const pct = stats.total > 0 ? Math.round((done / stats.total) * 100) : 0;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    PAUSED: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700'
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{name}</h2>
        <span className={`badge ${statusColors[status] ?? 'bg-slate-100 text-slate-700'}`}>{status}</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
        <div
          className="bg-brand-600 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Progress: {done} / {stats.total} ({pct}%)
      </p>

      <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
        <Stat label="Total" value={stats.total} color="text-slate-700" />
        <Stat label="Pending" value={stats.pending} color="text-slate-500" />
        <Stat label="Processing" value={stats.processing} color="text-blue-600" />
        <Stat label="Sent" value={stats.sent} color="text-green-600" />
        <Stat label="Failed" value={stats.failed} color="text-red-600" />
        <Stat label="Needs info" value={stats.needsAttention} color="text-amber-600" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
