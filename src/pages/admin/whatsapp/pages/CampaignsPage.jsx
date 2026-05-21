import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Megaphone,
  RefreshCw,
  Send,
} from 'lucide-react';
import { cn, inputCls, selectCls } from '../shared/cn';
import { STAGE_CONFIG } from '../shared/constants';
import {
  createCampaign,
  fetchCampaigns,
  fetchTemplates,
  refreshCampaignStats,
} from '../shared/api';

const CAMPAIGN_STAGES = [
  'handoff_pending',
  'payment_pending',
  'price_summary',
  'checkout_link_sent',
  'service_selection',
  'consultant_reserved',
];

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-lg font-bold tabular-nums text-slate-900">{value ?? 0}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      {sub && <p className="text-[10px] text-emerald-600 font-medium">{sub}</p>}
    </div>
  );
}

export default function CampaignsPage() {
  const { activeSp } = useOutletContext();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    template_name: '',
    stages: [],
    sources: [],
    temperatures: [],
  });
  const [isSending, setIsSending] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([fetchCampaigns(), fetchTemplates()])
      .then(([c, t]) => {
        setCampaigns(Array.isArray(c) ? c : []);
        const list = Array.isArray(t) ? t : t?.templates || [];
        setTemplates(list);
      })
      .catch(() => setErr('Could not load campaigns.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSend = async () => {
    if (!form.name || !form.template_name) {
      setErr('Campaign name and template are required.');
      return;
    }
    setIsSending(true);
    setErr('');
    setSuccess('');
    try {
      const audience_filter = {
        stages: form.stages,
        sources: form.sources,
        temperatures: form.temperatures,
      };
      const c = await createCampaign({
        name: form.name,
        template_name: form.template_name,
        audience_filter,
        sales_person_id: activeSp?.id || null,
      });
      setCampaigns((prev) => [c, ...prev]);
      setForm({ name: '', template_name: '', stages: [], sources: [], temperatures: [] });
      setSuccess('Campaign queued — sends will roll out via Celery worker.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to send campaign.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshStats = async (campaignId) => {
    setRefreshingId(campaignId);
    try {
      const updated = await refreshCampaignStats(campaignId);
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? updated : c)));
    } catch { /* silent */ }
    finally { setRefreshingId(null); }
  };

  const toggleFilter = (key, val) => {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const statusColor = (status) => ({
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    running:   'bg-blue-50 text-blue-700 border-blue-200',
    queued:    'bg-amber-50 text-amber-700 border-amber-200',
  }[status] || 'bg-slate-100 text-slate-600 border-slate-200');

  return (
    <div className="p-6 space-y-5">
      {/* Create campaign */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Megaphone size={16} />
          </span>
          <h2 className="text-sm font-bold text-slate-800">New Campaign</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Campaign name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. May ITR Push"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Template</label>
            <select
              value={form.template_name}
              onChange={(e) => setForm((f) => ({ ...f, template_name: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select template</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">
            Audience filters <span className="font-normal text-slate-400">(leave blank for everyone)</span>
          </p>

          <div>
            <p className="text-[10px] text-slate-500 mb-1.5">Temperature</p>
            <div className="flex gap-1.5">
              {['hot', 'warm', 'cold'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleFilter('temperatures', t)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
                    form.temperatures.includes(t)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-slate-500 mb-1.5">Conversation stage</p>
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleFilter('stages', s)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                    form.stages.includes(s)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {STAGE_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle size={13} />
            {err}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 size={13} />
            {success}
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {isSending ? 'Queueing campaign…' : 'Send Campaign'}
          </button>
        </div>
      </div>

      {/* Campaigns list */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Campaign history</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <Megaphone size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No campaigns sent yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Template: <span className="font-mono">{c.template_name}</span> ·{' '}
                      {c.created_by?.name || '—'} ·{' '}
                      {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', statusColor(c.status))}>
                      {c.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRefreshStats(c.id)}
                      disabled={refreshingId === c.id}
                      title="Refresh stats"
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={cn(refreshingId === c.id && 'animate-spin')} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <StatBox label="Sent" value={c.total_sent} />
                  <StatBox label="Delivered" value={c.total_delivered} sub={c.delivered_pct} />
                  <StatBox label="Read" value={c.total_read} sub={c.read_pct} />
                  <StatBox label="Replied" value={c.total_replied} sub={c.replied_pct} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
