import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { cn, inputCls, modalCardCls, modalOverlayCls, selectCls, textareaCls } from '../shared/cn';
import { renderTemplatePreview } from '../shared/constants';
import { fetchTemplates, submitTemplate } from '../shared/api';

const STATUS_STYLES = {
  APPROVED:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:         'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED:        'bg-red-50 text-red-700 border-red-200',
  PAUSED:          'bg-slate-100 text-slate-600 border-slate-200',
  DISABLED:        'bg-slate-100 text-slate-600 border-slate-200',
};

const CATEGORY_OPTIONS = [
  { value: 'MARKETING',     label: 'Marketing' },
  { value: 'UTILITY',       label: 'Utility' },
  { value: 'AUTHENTICATION',label: 'Authentication' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en',    label: 'English (en)' },
  { value: 'en_US', label: 'English US (en_US)' },
  { value: 'hi',    label: 'Hindi (hi)' },
];

function TemplateCard({ template }) {
  const [open, setOpen] = useState(false);
  const statusKey = (template.status || '').toUpperCase();
  const sample = renderTemplatePreview(template.body || '', ['[name]', '[service]']);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <FileText size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate font-mono">{template.name}</p>
            <p className="text-[11px] text-slate-500">
              {template.category || '—'} · {template.language || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            STATUS_STYLES[statusKey] || STATUS_STYLES.DISABLED
          )}>
            {template.status || 'unknown'}
          </span>
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
          {template.body && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Body</p>
              <pre className="whitespace-pre-wrap text-xs text-slate-800 font-mono bg-white rounded-md border border-slate-200 px-3 py-2.5 leading-relaxed">
                {template.body}
              </pre>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sample render</p>
            <div className="rounded-xl bg-emerald-50 px-3.5 pt-3 pb-2.5 border border-emerald-200">
              <p className="mb-1 text-[10px] font-bold text-emerald-700">TaxPlan Bot</p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{sample}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [stageDefaults, setStageDefaults] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  const load = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setIsLoading(true);
    setError('');
    try {
      const data = await fetchTemplates({ forceRefresh: refresh });
      const list = Array.isArray(data) ? data : data?.templates || [];
      setTemplates(list);
      setStageDefaults(data?.stage_defaults || {});
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load templates. Check META_ACCESS_TOKEN.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Templates fetched from Meta Business Manager. Submit new templates here — Meta typically reviews within 24h.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load({ refresh: true })}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
            Refresh from Meta
          </button>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <Send size={13} />
            Submit new template
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Stage defaults */}
      {Object.keys(stageDefaults).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Auto-selected templates per stage</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(stageDefaults).map(([stage, name]) => (
              <div key={stage} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                <p className="text-[10px] text-slate-500 uppercase">{stage}</p>
                <p className="text-xs font-mono text-slate-800 truncate">{name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <FileText size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No templates found in Meta Business Manager.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => <TemplateCard key={t.name} template={t} />)}
        </div>
      )}

      {showSubmit && (
        <SubmitTemplateModal
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => { setShowSubmit(false); load({ refresh: true }); }}
        />
      )}
    </div>
  );
}

function SubmitTemplateModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState({
    name: '',
    language: 'en',
    category: 'MARKETING',
    body: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.body) {
      setErr('Name and body are required.');
      return;
    }
    setIsSubmitting(true);
    setErr('');
    setSuccess('');
    try {
      await submitTemplate(form);
      setSuccess('Submitted to Meta. Review status will appear here after ~24h.');
      setTimeout(onSubmitted, 1200);
    } catch (e) {
      setErr(e.response?.data?.error || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={modalOverlayCls} onClick={onClose}>
      <div className={`w-[520px] max-h-[90vh] flex flex-col ${modalCardCls}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="font-semibold text-slate-800">Submit template to Meta</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Reviewed by Meta within ~24 hours</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Template name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.replace(/\s+/g, '_').toLowerCase() }))}
              placeholder="e.g. itr_followup_v2"
              className={`${inputCls} font-mono`}
            />
            <p className="text-[11px] text-slate-400 mt-1">Lowercase, underscores only. No spaces.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Category <span className="text-red-500">*</span></label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={selectCls}
              >
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Language <span className="text-red-500">*</span></label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className={selectCls}
              >
                {LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Body <span className="text-red-500">*</span></label>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder={"Hi {{1}}, your {{2}} is ready! Tap below to checkout.\n\nUse {{1}}, {{2}} for variables."}
              className={`${textareaCls} font-mono`}
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle size={13} className="shrink-0" />
              {err}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
              <CheckCircle2 size={13} className="shrink-0" />
              {success}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Submitting…' : 'Submit to Meta'}
          </button>
        </div>
      </div>
    </div>
  );
}
