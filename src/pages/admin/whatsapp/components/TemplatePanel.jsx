import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BellOff,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { cn } from '../shared/cn';
import { countTemplateVars, renderTemplatePreview } from '../shared/constants';
import {
  fetchFollowupPreview,
  getOrFetchTemplates,
  resumeFollowups,
  sendFollowup,
  suppressFollowups,
} from '../shared/api';

export default function TemplatePanel({ conversation, onRefreshDetail }) {
  const conversationId = conversation?.id;
  const conversationStage = conversation?.current_stage;

  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuppressing, setIsSuppressing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const loadingForRef = useRef(null);

  const loadAll = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!conversationId) return;
    loadingForRef.current = conversationId;
    setIsLoadingPreview(true);
    setIsLoadingTemplates(true);
    setError('');
    try {
      const [previewData, templateData] = await Promise.all([
        fetchFollowupPreview(conversationId),
        getOrFetchTemplates({ forceRefresh }),
      ]);
      if (loadingForRef.current !== conversationId) return;
      setPreview(previewData);
      const allTemplates = templateData?.templates || [];
      setTemplates(allTemplates);

      const stageDefault = templateData?.stage_defaults?.[conversationStage];
      const fallbackName = previewData?.template_name;
      const autoName = stageDefault || fallbackName;
      const found = allTemplates.find((t) => t.name === autoName) || allTemplates[0] || null;
      setSelectedTemplate(found);
      if (found) {
        const varCount = countTemplateVars(found.body);
        const defaults = previewData?.default_variables || [];
        const merged = Array.from({ length: varCount }, (_, i) => defaults[i] ?? '');
        setVariables(merged);
      }
    } catch (e) {
      if (loadingForRef.current !== conversationId) return;
      setError(e.response?.data?.error || 'Could not load template data.');
    } finally {
      if (loadingForRef.current === conversationId) {
        setIsLoadingPreview(false);
        setIsLoadingTemplates(false);
      }
    }
  }, [conversationId, conversationStage]);

  useEffect(() => {
    setPreview(null);
    setSelectedTemplate(null);
    setVariables([]);
    setError('');
    setSuccessMsg('');
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) loadAll();
  }, [isOpen, loadAll]);

  const handleTemplateChange = (templateName) => {
    const tpl = templates.find((t) => t.name === templateName) || null;
    setSelectedTemplate(tpl);
    if (tpl) {
      const varCount = countTemplateVars(tpl.body);
      const defaults = preview?.default_variables || [];
      setVariables(Array.from({ length: varCount }, (_, i) => defaults[i] ?? ''));
    } else {
      setVariables([]);
    }
    setError('');
    setSuccessMsg('');
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setIsSending(true);
    setError('');
    setSuccessMsg('');
    try {
      await sendFollowup(conversationId, variables, selectedTemplate.name);
      setSuccessMsg('Template sent!');
      await loadAll();
      if (onRefreshDetail) onRefreshDetail({ silent: true });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send template.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSuppress = async () => {
    if (!window.confirm('Stop all future follow-ups for this conversation?')) return;
    setIsSuppressing(true);
    setError('');
    setSuccessMsg('');
    try {
      await suppressFollowups(conversationId);
      setSuccessMsg('Follow-ups stopped.');
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to suppress.');
    } finally {
      setIsSuppressing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setError('');
    setSuccessMsg('');
    try {
      await resumeFollowups(conversationId);
      setSuccessMsg('Follow-ups re-enabled.');
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to resume.');
    } finally {
      setIsResuming(false);
    }
  };

  const suppressed = preview?.suppressed ?? false;
  const eligible = preview?.eligible ?? false;
  const varCount = selectedTemplate ? countTemplateVars(selectedTemplate.body) : 0;
  const AUTO_SLOTS = 2;
  const previewText = renderTemplatePreview(selectedTemplate?.body || '', variables);

  return (
    <div className="shrink-0 border-t border-[#2a3942]">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-[#111b21] px-4 py-2.5 text-left transition-colors hover:bg-[#182229]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15">
          <Send size={11} className="text-[#00a884]" />
        </span>
        <span className="flex-1 text-xs font-semibold text-[#e9edef]">Send Template</span>
        {selectedTemplate && !isOpen && (
          <span className="max-w-[120px] truncate rounded bg-[#1f2c34] px-2 py-0.5 font-mono text-[10px] text-[#8696a0]">
            {selectedTemplate.name}
          </span>
        )}
        {preview && (
          <span className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            suppressed ? 'bg-red-900/30 text-red-400'
              : eligible ? 'bg-[#00a884]/15 text-[#06cf9c]' : 'bg-white/5 text-[#8696a0]'
          )}>
            {suppressed ? 'Stopped' : eligible ? 'Ready' : 'Not eligible'}
          </span>
        )}
        <ChevronRight size={13} className={cn('shrink-0 text-[#8696a0] transition-transform duration-200', isOpen && 'rotate-90')} />
      </button>

      {isOpen && (
        <div className="bg-[#0b1014] px-4 pb-4 pt-3 space-y-3">
          {(isLoadingPreview || isLoadingTemplates) ? (
            <div className="flex items-center gap-2 py-5 text-xs text-[#8696a0]">
              <RefreshCw size={13} className="animate-spin" />
              Loading templates…
            </div>
          ) : (
            <>
              {suppressed && (
                <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  Follow-ups are stopped for this lead.
                </div>
              )}
              {!eligible && !suppressed && preview?.reason && (
                <div className="flex items-start gap-2 rounded-lg border border-[#2a3942] bg-[#111b21] px-3 py-2 text-xs text-[#8696a0]">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  {preview.reason}
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3b4a54]">Template</p>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 && (
                      <span className="text-[10px] text-[#3b4a54]">{templates.length} available</span>
                    )}
                    <button
                      type="button"
                      onClick={() => loadAll({ forceRefresh: true })}
                      disabled={isLoadingTemplates}
                      title="Refresh templates from Meta"
                      className="flex h-4 w-4 items-center justify-center rounded text-[#3b4a54] transition hover:text-[#8696a0] disabled:opacity-40"
                    >
                      <RefreshCw size={10} className={isLoadingTemplates ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                {templates.length ? (
                  <div className="relative">
                    <select
                      value={selectedTemplate?.name || ''}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#1f2c34] bg-[#141d22] py-2.5 pl-3 pr-8 text-xs font-medium text-[#e9edef] outline-none transition focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/20"
                    >
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[#8696a0]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-[#2a3942] bg-[#111b21] px-3 py-2.5 text-xs text-[#8696a0]">
                    <AlertCircle size={12} />
                    No approved templates found.
                  </div>
                )}
              </div>

              {selectedTemplate && (
                <>
                  <div className={cn('flex gap-3', varCount === 0 && 'flex-col')}>
                    {varCount > 0 && (
                      <div className="flex w-[44%] shrink-0 flex-col gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3b4a54]">Variables</p>
                        {Array.from({ length: varCount }).map((_, idx) => {
                          const isAuto = idx < AUTO_SLOTS;
                          const placeholder = idx === 0 ? 'Name' : idx === 1 ? 'Service' : `Variable ${idx + 1}`;
                          return (
                            <div key={idx} className="group relative">
                              <span className={cn(
                                'absolute -top-px left-3 flex h-4 items-center rounded-t-sm px-1.5 font-mono text-[9px] font-bold',
                                isAuto ? 'bg-[#005c4b] text-[#06cf9c]' : 'bg-[#1a3252] text-[#53bdeb]'
                              )}>
                                {`{{${idx + 1}}}`}
                              </span>
                              <input
                                value={variables[idx] ?? ''}
                                readOnly={isAuto}
                                onChange={(e) => {
                                  if (isAuto) return;
                                  const next = [...variables];
                                  next[idx] = e.target.value;
                                  setVariables(next);
                                }}
                                className={cn(
                                  'w-full rounded-lg rounded-tl-none border border-[#1f2c34] pt-4 pb-2 px-3 text-sm font-medium text-[#e9edef] placeholder-[#3b4a54] outline-none transition',
                                  isAuto
                                    ? 'bg-[#0d1f1a] cursor-default text-[#8696a0]'
                                    : 'bg-[#141d22] focus:border-[#53bdeb] focus:bg-[#0d1418]'
                                )}
                                placeholder={placeholder}
                                title={isAuto ? 'Auto-filled from conversation' : ''}
                              />
                              {isAuto && (
                                <span className="absolute right-2 top-1/2 mt-1 text-[9px] text-[#3b4a54]">auto</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#3b4a54]">Preview</p>
                      <div className="relative rounded-xl rounded-tl-none bg-[#1f2c34] px-3.5 pt-3 pb-2.5 shadow-lg">
                        <span aria-hidden className="absolute -left-[7px] top-0 border-b-[7px] border-r-[7px] border-b-transparent border-r-[#1f2c34]" />
                        <p className="mb-1 text-[10px] font-semibold text-[#06cf9c]">TaxPlan Bot</p>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#e9edef]">
                          {previewText.split(/({{[^}]+}})/).map((part, i) =>
                            /^{{/.test(part)
                              ? <span key={i} className="rounded bg-[#00a884]/20 px-0.5 font-mono text-[#06cf9c]">{part}</span>
                              : part
                          )}
                        </p>
                        <div className="mt-1.5 flex items-center justify-end gap-1">
                          <span className="text-[11px] text-[#8696a0]">now</span>
                          <CheckCheck size={12} className="text-[#8696a0]" strokeWidth={2.5} />
                        </div>
                      </div>
                      <p className="mt-1 text-right font-mono text-[10px] text-[#3b4a54]">
                        {selectedTemplate.name}
                        {preview?.last_status && (
                          <span className={cn('ml-1', preview.last_status === 'sent' ? 'text-[#00a884]' : 'text-red-500')}>
                            · last: {preview.last_template_name || ''} {preview.last_status}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{error}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#00a884]/20 bg-[#00a884]/10 px-3 py-2 text-xs font-medium text-[#06cf9c]">
                      <CheckCircle2 size={12} className="shrink-0" />{successMsg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {suppressed ? (
                      <button
                        type="button"
                        disabled={isResuming}
                        onClick={handleResume}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00a884] py-2.5 text-xs font-semibold text-white transition hover:bg-[#06cf9c] active:scale-[0.98] disabled:opacity-50"
                      >
                        {isResuming ? <RefreshCw size={12} className="animate-spin" /> : <Mail size={12} />}
                        {isResuming ? 'Resuming…' : 'Resume Follow-ups'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isSending || !selectedTemplate}
                          onClick={handleSend}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00a884] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#00a884]/20 transition hover:bg-[#06cf9c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                        >
                          {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                          {isSending ? 'Sending…' : 'Send Template'}
                        </button>
                        <button
                          type="button"
                          disabled={isSuppressing}
                          onClick={handleSuppress}
                          title="Stop all follow-ups"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1f2c34] bg-[#111b21] px-3 py-2.5 text-xs font-medium text-[#8696a0] transition hover:border-red-900 hover:bg-red-950/30 hover:text-red-400 active:scale-[0.98] disabled:opacity-50"
                        >
                          <BellOff size={12} />
                          {isSuppressing ? '…' : 'Stop'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
