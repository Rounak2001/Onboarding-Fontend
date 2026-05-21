import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../shared/cn';
import {
  BULK_STAGE_OPTIONS,
  CATEGORY_OPTIONS,
  countTemplateVars,
  renderTemplatePreview,
} from '../shared/constants';
import {
  getBulkFollowupStatus,
  getOrFetchTemplates,
  previewBulkFollowup,
  sendBulkFollowup,
} from '../shared/api';

export default function BulkSendDrawer({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [stageDefaults, setStageDefaults] = useState({});
  const [stage, setStage] = useState('price_summary');
  const [category, setCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [extraVars, setExtraVars] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const fetchTemplatesNow = useCallback(({ forceRefresh = false } = {}) => {
    setIsLoadingTemplates(true);
    setError('');
    getOrFetchTemplates({ forceRefresh })
      .then((data) => {
        setTemplates(data?.templates || []);
        setStageDefaults(data?.stage_defaults || {});
      })
      .catch(() => setError('Could not fetch templates from Meta. Check META_ACCESS_TOKEN.'))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplatesNow();
  }, [isOpen, fetchTemplatesNow]);

  useEffect(() => {
    if (!templates.length) return;
    const defaultName = stageDefaults[stage];
    const found = templates.find((t) => t.name === defaultName) || templates[0];
    setSelectedTemplate(found || null);
    setPreviewData(null);
    setExtraVars([]);
  }, [stage, templates, stageDefaults]);

  const handleTemplateChange = (name) => {
    const tpl = templates.find((t) => t.name === name) || null;
    setSelectedTemplate(tpl);
    setExtraVars([]);
    setPreviewData(null);
    setError('');
  };

  const totalVars = selectedTemplate ? countTemplateVars(selectedTemplate.body) : 0;
  const extraVarCount = Math.max(0, totalVars - 2);

  const handlePreview = async () => {
    setIsLoadingPreview(true);
    setError('');
    try {
      const data = await previewBulkFollowup(stage, category);
      setPreviewData(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Preview failed.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const startPolling = (id) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let errorStreak = 0;
    const MAX_ERRORS = 10;
    pollRef.current = setInterval(async () => {
      try {
        const statusData = await getBulkFollowupStatus(id);
        errorStreak = 0;
        setJobStatus(statusData);
        if (statusData?.status === 'completed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setIsSending(false);
        }
      } catch {
        errorStreak += 1;
        if (errorStreak >= MAX_ERRORS) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setIsSending(false);
          setError('Lost connection while polling job status. Check Redis/Celery.');
        }
      }
    }, 1500);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleSend = async () => {
    if (!selectedTemplate || !previewData?.eligible) return;
    if (!window.confirm(`Send "${selectedTemplate.name}" to ${previewData.eligible} conversations at stage "${stage}"?`)) return;
    setIsSending(true);
    setJobStatus(null);
    setError('');
    try {
      const result = await sendBulkFollowup({
        stage,
        category,
        templateName: selectedTemplate.name,
        extraVariables: extraVars,
      });
      const id = result?.job_id;
      setJobStatus({ status: 'queued', sent: 0, failed: 0, total: result?.total || previewData?.eligible || 0 });
      if (id) startPolling(id);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start bulk send.');
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending && jobStatus?.status !== 'completed') {
      if (!window.confirm('A bulk send is in progress. Close anyway?')) return;
    }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setJobStatus(null);
    setIsSending(false);
    setPreviewData(null);
    setError('');
    onClose();
  };

  const sent = jobStatus?.sent ?? 0;
  const failed = jobStatus?.failed ?? 0;
  const total = jobStatus?.total ?? 0;
  const retried = jobStatus?.retried ?? 0;
  const progressPct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
  const isDone = jobStatus?.status === 'completed';
  const log = jobStatus?.log || [];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[#0b1014]/85 backdrop-blur-[2px]" onClick={handleClose} />
      )}

      <div className={cn(
        'fixed right-0 top-0 z-50 flex h-full w-[460px] flex-col bg-[#0d1418] shadow-[-8px_0_48px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="relative shrink-0 overflow-hidden bg-[#111b21]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#00a884] via-[#06cf9c] to-[#00a884]/0" />
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00a884]/30 to-[#00a884]/10 ring-1 ring-[#00a884]/40">
              <Zap size={17} className="text-[#00a884]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold leading-tight text-[#e9edef]">Bulk Send</p>
              <p className="text-[11px] text-[#8696a0]">Send a WhatsApp template to multiple leads at once</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#8696a0] transition hover:bg-white/10 hover:text-[#e9edef]"
            >
              <X size={15} />
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-[#2a3942] to-transparent" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingTemplates ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884]/10 ring-1 ring-[#00a884]/20">
                <RefreshCw size={20} className="animate-spin text-[#00a884]" />
              </div>
              <p className="text-xs text-[#8696a0]">Loading approved templates from Meta…</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a2530]">
              <div className="px-5 py-4 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b4a54]">Audience Filter</p>
                <div>
                  <label className="mb-2 block text-[11px] font-medium text-[#8696a0]">Conversation Stage</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BULK_STAGE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => { setStage(o.value); setPreviewData(null); }}
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-150',
                          stage === o.value
                            ? 'border-[#00a884]/50 bg-[#00a884] text-white shadow-md shadow-[#00a884]/25'
                            : 'border-[#1f2c34] bg-[#1a2530] text-[#8696a0] hover:border-[#2a3942] hover:bg-[#202c33] hover:text-[#aebac1]'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-[#8696a0]">
                    Category <span className="text-[#3b4a54]">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => { setCategory(e.target.value); setPreviewData(null); }}
                      className="w-full appearance-none rounded-lg border border-[#1f2c34] bg-[#141d22] py-2.5 pl-3 pr-8 text-[13px] font-medium text-[#e9edef] outline-none transition focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/20"
                    >
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronRight size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#8696a0]" />
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b4a54]">Template</p>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 && (
                      <span className="rounded-full bg-[#1f2c34] px-2 py-0.5 text-[10px] text-[#8696a0]">
                        {templates.length} approved
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchTemplatesNow({ forceRefresh: true })}
                      disabled={isLoadingTemplates}
                      className="flex h-5 w-5 items-center justify-center rounded text-[#3b4a54] transition hover:text-[#8696a0] disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={isLoadingTemplates ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                {templates.length ? (
                  <div className="relative">
                    <select
                      value={selectedTemplate?.name || ''}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#1f2c34] bg-[#141d22] py-2.5 pl-3 pr-8 font-mono text-[13px] font-medium text-[#e9edef] outline-none transition focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/20"
                    >
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#8696a0]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-[#1f2c34] bg-[#111b21] px-3 py-3 text-xs text-[#8696a0]">
                    <AlertCircle size={13} />
                    No approved templates found in Meta Business Manager.
                  </div>
                )}

                {selectedTemplate && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-[#8696a0]">Message preview</p>
                    <div className="ml-3 relative">
                      <span aria-hidden className="absolute -left-3 top-0 border-b-[8px] border-r-[8px] border-b-transparent border-r-[#1f2c34]" />
                      <div className="rounded-xl rounded-tl-none bg-[#1f2c34] px-4 pt-3 pb-3 shadow-lg">
                        <p className="mb-1.5 text-[10px] font-bold text-[#06cf9c]">TaxPlan Bot</p>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#e9edef]">
                          {renderTemplatePreview(selectedTemplate.body, ['[name]', '[service]', ...extraVars])
                            .split(/({{[^}]+}})/)
                            .map((part, i) =>
                              /^{{/.test(part)
                                ? <span key={i} className="rounded bg-[#00a884]/20 px-0.5 font-mono text-[#06cf9c]">{part}</span>
                                : part
                            )}
                        </p>
                        <div className="mt-2 flex items-center justify-end gap-1 border-t border-[#2a3942] pt-1.5">
                          <span className="text-[11px] text-[#8696a0]">now</span>
                          <CheckCheck size={12} className="text-[#8696a0]" strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#005c4b]/50 px-2 py-0.5 font-mono text-[10px] text-[#06cf9c]">{'{{1}} = name'}</span>
                      <span className="rounded-full bg-[#005c4b]/50 px-2 py-0.5 font-mono text-[10px] text-[#06cf9c]">{'{{2}} = service'}</span>
                      <span className="rounded-full bg-[#1f2c34] px-2 py-0.5 text-[10px] text-[#8696a0]">auto-filled per lead</span>
                    </div>
                  </div>
                )}

                {extraVarCount > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-[#8696a0]">Additional variables</p>
                    <div className="space-y-2">
                      {Array.from({ length: extraVarCount }).map((_, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -top-px left-3 flex h-4 items-center rounded-t-sm bg-[#1a3252] px-1.5 font-mono text-[9px] font-bold text-[#53bdeb]">
                            {`{{${i + 3}}}`}
                          </span>
                          <input
                            value={extraVars[i] ?? ''}
                            onChange={(e) => {
                              const next = [...extraVars];
                              next[i] = e.target.value;
                              setExtraVars(next);
                            }}
                            placeholder={`Variable ${i + 3}…`}
                            className="w-full rounded-lg rounded-tl-none border border-[#1f2c34] bg-[#141d22] pb-2.5 pl-3 pr-3 pt-4 text-sm text-[#e9edef] placeholder-[#3b4a54] outline-none focus:border-[#53bdeb]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b4a54]">Audience</p>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isLoadingPreview || !selectedTemplate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2a3942] bg-[#141d22] py-3 text-[13px] font-semibold text-[#8696a0] transition hover:border-[#00a884]/40 hover:bg-[#0d1f1a] hover:text-[#06cf9c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoadingPreview ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
                  {isLoadingPreview ? 'Counting eligible leads…' : 'Check Eligible Leads'}
                </button>

                {previewData && (
                  <div className="overflow-hidden rounded-xl border border-[#1f2c34] bg-[#111b21]">
                    <div className="grid grid-cols-3 divide-x divide-[#1f2c34] border-b border-[#1f2c34]">
                      <div className="px-3 py-3 text-center">
                        <p className="text-xl font-bold tabular-nums text-[#06cf9c]">{previewData.eligible}</p>
                        <p className="text-[10px] text-[#8696a0]">eligible</p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <p className="text-xl font-bold tabular-nums text-[#e9edef]">{previewData.total}</p>
                        <p className="text-[10px] text-[#8696a0]">total</p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <p className="text-xl font-bold tabular-nums text-amber-400">{previewData.skipped ?? 0}</p>
                        <p className="text-[10px] text-[#8696a0]">skipped</p>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#2a3942]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00a884] to-[#06cf9c] transition-all duration-700"
                          style={{ width: previewData.total > 0 ? `${Math.round((previewData.eligible / previewData.total) * 100)}%` : '0%' }}
                        />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-[#3b4a54]">
                        {previewData.total > 0 ? Math.round((previewData.eligible / previewData.total) * 100) : 0}% eligible
                      </p>
                    </div>
                    {previewData.sample?.length > 0 && (
                      <div className="border-t border-[#1f2c34] px-4 pb-3 pt-2.5">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#3b4a54]">Sample Leads</p>
                        <div className="space-y-1.5">
                          {previewData.sample.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-medium text-[#e9edef]">{s.name}</span>
                              <span className="shrink-0 rounded-md bg-[#1f2c34] px-2 py-0.5 text-[10px] text-[#8696a0]">{s.service}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(jobStatus || isSending) && (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b4a54]">
                      {isDone ? 'Completed' : 'Sending…'}
                    </p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      isDone
                        ? failed > 0 ? 'bg-amber-900/30 text-amber-400' : 'bg-[#00a884]/15 text-[#06cf9c]'
                        : 'bg-[#1f2c34] text-[#8696a0]'
                    )}>
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#1f2c34]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isDone
                          ? failed > 0 ? 'bg-amber-500' : 'bg-gradient-to-r from-[#00a884] to-[#06cf9c]'
                          : 'bg-gradient-to-r from-[#00a884] via-[#06cf9c] to-[#00a884] animate-pulse'
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#00a884]/10 px-2.5 py-1 text-[11px] font-semibold text-[#06cf9c]">{sent} sent</span>
                    {failed > 0 && <span className="rounded-full bg-red-900/20 px-2.5 py-1 text-[11px] font-semibold text-red-400">{failed} failed</span>}
                    {retried > 0 && <span className="rounded-full bg-amber-900/20 px-2.5 py-1 text-[11px] font-semibold text-amber-400">{retried} retried</span>}
                    <span className="ml-auto text-[11px] text-[#8696a0]">of {total}</span>
                  </div>
                  {log.length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-[#1f2c34] bg-[#0b1014]">
                      {log.slice().reverse().map((entry) => (
                        <div
                          key={`${entry.conversation_id}-${entry.timestamp}`}
                          className={cn(
                            'flex items-center justify-between gap-2 border-b border-[#1a2530] px-3 py-2 last:border-0',
                            entry.status === 'sent' ? 'text-[#06cf9c]' : 'text-red-400'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {entry.status === 'sent'
                              ? <CheckCheck size={11} strokeWidth={2.5} className="shrink-0" />
                              : <X size={11} strokeWidth={2.5} className="shrink-0" />
                            }
                            <span className="truncate text-[11px] font-medium">{entry.name}</span>
                            {(entry.was_retry || entry.retrying) && (
                              <span className="shrink-0 rounded bg-amber-900/40 px-1 text-[9px] text-amber-400">retry</span>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] text-[#8696a0]">{entry.service}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mx-5 my-3 flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5 text-xs text-red-400">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#1a2530] bg-[#111b21] p-4">
          {isDone ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#00a884]/15 px-4 py-3.5 text-sm font-bold text-[#06cf9c] ring-1 ring-[#00a884]/20">
              <CheckCircle2 size={16} />
              Done — {sent} sent{failed > 0 ? `, ${failed} failed` : ''}
            </div>
          ) : (
            <>
              {!previewData && (
                <p className="mb-2 text-center text-[11px] text-[#3b4a54]">
                  Check eligible leads before sending
                </p>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !selectedTemplate || !previewData || !previewData.eligible}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-3.5 text-[14px] font-bold text-white shadow-lg shadow-[#00a884]/25 transition hover:bg-[#06cf9c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                {isSending ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                {isSending
                  ? `Sending ${sent} / ${total}…`
                  : previewData?.eligible
                    ? `Send to ${previewData.eligible} Lead${previewData.eligible !== 1 ? 's' : ''}`
                    : 'Send Template'
                }
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
