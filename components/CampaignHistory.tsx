'use client';

export interface CampaignSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function CampaignHistory({
  campaigns,
  onOpen,
  activeCampaignId
}: {
  campaigns: CampaignSummary[];
  onOpen: (id: string) => void;
  activeCampaignId: string | null;
}) {
  if (campaigns.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Campaign history</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Sent</th>
              <th className="py-2 pr-3">Failed</th>
              <th className="py-2 pr-3">Pending</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-slate-50 last:border-0 ${
                  c.id === activeCampaignId ? 'bg-brand-50' : ''
                }`}
              >
                <td className="py-2 pr-3">{c.name}</td>
                <td className="py-2 pr-3">{c.type}</td>
                <td className="py-2 pr-3">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-3">{c.total}</td>
                <td className="py-2 pr-3">{c.sent}</td>
                <td className="py-2 pr-3">{c.failed}</td>
                <td className="py-2 pr-3">{c.pending}</td>
                <td className="py-2 pr-3">
                  <button className="text-brand-600 text-xs hover:underline" onClick={() => onOpen(c.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
