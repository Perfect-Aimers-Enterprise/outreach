'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AuthPanel, { AuthUser } from '@/components/AuthPanel';
import SettingsPanel from '@/components/SettingsPanel';
import CsvUploader, { CsvParseSummary } from '@/components/CsvUploader';
import CvUploader, { CvAttachment } from '@/components/CvUploader';
import TemplateEditor, { OutreachType } from '@/components/TemplateEditor';
import CampaignPreview from '@/components/CampaignPreview';
import CampaignStats, { Stats } from '@/components/CampaignStats';
import ContactTable, { ContactRow } from '@/components/ContactTable';
import QueueControls, { QueueSettings } from '@/components/QueueControls';
import CampaignHistory, { CampaignSummary } from '@/components/CampaignHistory';

interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
  contacts: ContactRow[];
  stats: Stats;
}

export default function Page() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [csvSummary, setCsvSummary] = useState<CsvParseSummary | null>(null);
  const [cvAttachment, setCvAttachment] = useState<CvAttachment | null>(null);

  const [type, setType] = useState<OutreachType>('COMPANY');
  const [useCustom, setUseCustom] = useState(false);
  const [customTemplate, setCustomTemplate] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  const [campaignName, setCampaignName] = useState('');
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [queueSettings, setQueueSettings] = useState<QueueSettings>({
    batchSize: 5,
    delayBetweenBatchesMs: 60_000,
    maxRetries: 3
  });

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadCampaigns = useCallback(() => {
    fetch('/api/campaigns')
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
  }, []);

  const loadDetail = useCallback((id: string) => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) setDetail(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) loadCampaigns();
  }, [user, loadCampaigns]);

  useEffect(() => {
    if (!activeCampaignId) return;
    loadDetail(activeCampaignId);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadDetail(activeCampaignId);
      loadCampaigns();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeCampaignId, loadDetail, loadCampaigns]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <AuthPanel onAuthed={setUser} />;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setDetail(null);
    setActiveCampaignId(null);
  }

  async function createCampaign() {
    if (!csvSummary || csvSummary.valid.length === 0) {
      setCreateError('Upload a CSV with at least one valid contact first.');
      return;
    }
    if (!campaignName.trim()) {
      setCreateError('Give the campaign a name.');
      return;
    }
    if (useCustom && !customTemplate.trim()) {
      setCreateError('Write a custom message, or switch back to the built-in template.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          type: useCustom ? 'CUSTOM' : type,
          customTemplate: useCustom ? customTemplate : undefined,
          customSubject: useCustom ? customSubject : undefined,
          attachmentId: cvAttachment?.id,
          contacts: csvSummary.valid,
          batchSize: queueSettings.batchSize,
          delayBetweenBatchesMs: queueSettings.delayBetweenBatchesMs,
          maxRetries: queueSettings.maxRetries
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create campaign.');
        return;
      }
      setActiveCampaignId(data.campaign.id);
      loadCampaigns();
    } catch {
      setCreateError('Could not reach the server.');
    } finally {
      setCreating(false);
    }
  }

  async function startCampaign() {
    if (!activeCampaignId) return;
    setStarting(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/campaigns/${activeCampaignId}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to start campaign.');
        return;
      }
      loadDetail(activeCampaignId);
      loadCampaigns();
    } finally {
      setStarting(false);
    }
  }

  async function pauseCampaign() {
    if (!activeCampaignId) return;
    await fetch(`/api/campaigns/${activeCampaignId}/pause`, { method: 'POST' });
    loadDetail(activeCampaignId);
  }

  async function resumeCampaign() {
    if (!activeCampaignId) return;
    await fetch(`/api/campaigns/${activeCampaignId}/resume`, { method: 'POST' });
    loadDetail(activeCampaignId);
  }

  async function retryContact(id: string) {
    await fetch(`/api/contacts/${id}/retry`, { method: 'POST' });
    if (activeCampaignId) loadDetail(activeCampaignId);
  }

  async function cancelContact(id: string) {
    await fetch(`/api/contacts/${id}/cancel`, { method: 'POST' });
    if (activeCampaignId) loadDetail(activeCampaignId);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email Outreach Dashboard</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {!user.verified && (
            <span className="badge bg-amber-100 text-amber-700">Pending verification</span>
          )}
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {!user.verified && (
        <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Your account hasn't been verified yet, so campaigns can be created and previewed but won't
          send. Ask the app owner to verify your account.
        </div>
      )}

      <SettingsPanel />

      <CsvUploader onParsed={setCsvSummary} />

      <CvUploader onSelected={setCvAttachment} />

      <TemplateEditor
        type={type}
        onTypeChange={setType}
        useCustom={useCustom}
        onUseCustomChange={setUseCustom}
        customTemplate={customTemplate}
        onCustomTemplateChange={setCustomTemplate}
        customSubject={customSubject}
        onCustomSubjectChange={setCustomSubject}
      />

      {csvSummary && csvSummary.valid.length > 0 && (
        <CampaignPreview
          contacts={csvSummary.valid}
          type={type}
          useCustom={useCustom}
          customTemplate={customTemplate}
          customSubject={customSubject}
          cvFilename={cvAttachment?.filename ?? null}
        />
      )}

      {!detail && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">4. Create campaign</h2>
          <div className="mb-3">
            <label className="label">Campaign name</label>
            <input
              className="input"
              placeholder="September Outreach"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          {!cvAttachment && (
            <p className="text-xs text-amber-600 mb-3">
              No CV uploaded yet — you can create the campaign, but it can't be started until a CV is
              attached.
            </p>
          )}
          {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
          <button className="btn-primary" onClick={createCampaign} disabled={creating}>
            {creating ? 'Creating...' : 'Create campaign'}
          </button>
        </div>
      )}

      {detail && (
        <>
          <CampaignStats name={detail.campaign.name} status={detail.campaign.status} stats={detail.stats} />

          <QueueControls
            settings={queueSettings}
            onSettingsChange={setQueueSettings}
            disabled={!cvAttachment}
            campaignStatus={detail.campaign.status}
            onStart={startCampaign}
            onPause={pauseCampaign}
            onResume={resumeCampaign}
            starting={starting}
          />
          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <ContactTable contacts={detail.contacts} onRetry={retryContact} onCancel={cancelContact} />

          <button
            className="text-sm text-brand-600 hover:underline"
            onClick={() => {
              setDetail(null);
              setActiveCampaignId(null);
              setCampaignName('');
            }}
          >
            + Start a new campaign
          </button>
        </>
      )}

      <CampaignHistory
        campaigns={campaigns}
        activeCampaignId={activeCampaignId}
        onOpen={(id) => setActiveCampaignId(id)}
      />
    </div>
  );
}
