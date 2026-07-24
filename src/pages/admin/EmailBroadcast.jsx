import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserSquare, Briefcase, Receipt, ShoppingCart,
  Phone, CheckCircle2, Megaphone, Wallet, LifeBuoy, Inbox, Mail, Send, Paperclip, X,
  PenSquare, ClipboardList, FolderOpen, BarChart3, AlertTriangle, Info, Trash2,
  RefreshCw, Clock, MailCheck, Eye, FileSpreadsheet, HelpCircle, Copy, Upload,
  MousePointerClick, MailOpen, ChevronRight,
} from 'lucide-react';
import { apiUrl } from '../../utils/apiBase';
import { adminUrl } from '../../utils/adminPath';
import { clearAdminSession, getAdminToken } from '../../utils/adminSession';
import { useAdminTheme } from './adminTheme';
import AdminThemeToggle from './AdminThemeToggle';

const API_BASE = apiUrl('/admin-panel/email-broadcast');

// ── Sidebar nav (mirrors AdminDashboard's categories, standalone-page style) ──
const NAV_GROUPS = [
  { title: 'Core Platform', items: [
    { path: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
    { path: 'consultants', icon: Users, label: 'Consultants' },
    { path: 'clients', icon: UserSquare, label: 'Clients' },
    { path: 'services', icon: Briefcase, label: 'Services' },
  ]},
  { title: 'Operations', items: [
    { path: 'transactions', icon: Receipt, label: 'Transactions' },
    { path: 'carts', icon: ShoppingCart, label: 'Carts' },
    { path: 'call-logs', icon: Phone, label: 'Call Logs' },
    { path: 'software-survey', icon: CheckCircle2, label: 'Software Survey' },
  ]},
  { title: 'Marketing', items: [
    { path: 'ambassadors', icon: Megaphone, label: 'Ambassadors' },
    { path: 'ambassador-payouts', icon: Wallet, label: 'Ambassador Payouts' },
  ]},
  { title: 'Support & Mail', items: [
    { path: 'support', icon: LifeBuoy, label: 'Support' },
    { path: 'contact', icon: Inbox, label: 'Contact Inbox' },
    { path: 'emails', icon: Mail, label: 'Email Monitor' },
    { path: 'email-broadcast', icon: Send, label: 'Email Broadcast', active: true },
  ]},
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Design tokens (light + dark) ───────────────────────────────────────────
const TOKENS = {
  dark: {
    bg: '#080e1c', surface: '#0d1526', card: '#111d32', card2: '#162038',
    border: '#1e2d45', text: '#e2e8f0', muted: '#94a3b8', dim: '#475569',
    emerald: '#10b981', emeraldD: '#059669', red: '#ef4444', redD: '#dc2626',
    amber: '#f59e0b', amberD: '#d97706', blue: '#3b82f6', blueD: '#2563eb',
    purple: '#8b5cf6', purpleD: '#7c3aed', slate: '#334155', slateText: '#e2e8f0',
    STATUS: { draft: '#94a3b8', scheduled: '#f59e0b', sending: '#3b82f6', sent: '#10b981', failed: '#ef4444', cancelled: '#475569' },
  },
  light: {
    bg: '#f6f8fb', surface: '#ffffff', card: '#ffffff', card2: '#f1f5f9',
    border: '#e2e8f0', text: '#0f172a', muted: '#64748b', dim: '#cbd5e1',
    emerald: '#059669', emeraldD: '#047857', red: '#dc2626', redD: '#b91c1c',
    amber: '#d97706', amberD: '#b45309', blue: '#2563eb', blueD: '#1d4ed8',
    purple: '#7c3aed', purpleD: '#6d28d9', slate: '#e2e8f0', slateText: '#334155',
    STATUS: { draft: '#64748b', scheduled: '#b45309', sending: '#1d4ed8', sent: '#047857', failed: '#dc2626', cancelled: '#94a3b8' },
  },
};

const badge = (C, color) => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '999px',
  fontSize: '11px', fontWeight: 700, background: `${color}1a`, color, whiteSpace: 'nowrap',
});
const card = (C, extra = {}) => ({
  background: C.card, borderRadius: '12px', padding: '20px 22px',
  border: `1px solid ${C.border}`, boxShadow: C.text === '#0f172a' ? '0 1px 2px rgba(15,23,42,0.04)' : 'none', ...extra,
});
const btn = (C, color = C.slate, small = false, disabled = false, textColor = '#fff') => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
  padding: small ? '5px 12px' : '8px 18px',
  background: disabled ? C.dim : color, color: disabled ? C.muted : textColor, border: 'none',
  borderRadius: small ? '6px' : '8px', cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: small ? '12px' : '13px', fontWeight: 600, whiteSpace: 'nowrap',
});
const ghostBtn = (C, small = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: small ? '5px 12px' : '8px 16px', background: 'transparent', color: C.text,
  border: `1px solid ${C.border}`, borderRadius: small ? '6px' : '8px', cursor: 'pointer',
  fontSize: small ? '12px' : '13px', fontWeight: 600, whiteSpace: 'nowrap',
});
const inputStyle = (C) => ({
  background: C.card2, border: `1px solid ${C.border}`, borderRadius: '8px',
  padding: '8px 14px', color: C.text, fontSize: '13px', outline: 'none', minWidth: '0',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
});
const labelStyle = (C) => ({ fontSize: '12px', fontWeight: 700, color: C.muted, marginBottom: '6px', display: 'block' });
const card2Style = (C) => ({ background: C.card2, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px' });

const SOURCE_LABELS = {
  manual: 'Manual list / paste',
  clients: 'All Clients (consented)',
  consultants: 'All Consultants',
  contacts: 'Contact Form Submissions',
  excel: 'Excel Upload (.xlsx)',
};

// ── Small presentational pieces ────────────────────────────────────────────
const StatusBadge = ({ C, s }) => <span style={badge(C, C.STATUS[s] || C.slateText)}>{s}</span>;

const TabBar = ({ C, tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', background: C.surface, padding: '4px',
    borderRadius: '10px', marginBottom: '20px', border: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
    {tabs.map(t => {
      const Icon = t.icon;
      return (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: '8px 18px',
          background: active === t.key ? C.card2 : 'transparent',
          color: active === t.key ? C.text : C.muted,
          border: active === t.key ? `1px solid ${C.border}` : '1px solid transparent',
          borderRadius: '7px', cursor: 'pointer', fontSize: '13px',
          fontWeight: active === t.key ? 700 : 500, transition: 'all 0.15s',
        }}>
          <Icon size={14} /> {t.label}
        </button>
      );
    })}
  </div>
);

const Alert = ({ C, tone = 'ok', children }) => {
  const color = tone === 'err' ? C.red : tone === 'warn' ? C.amber : C.emerald;
  const Icon = tone === 'err' ? AlertTriangle : tone === 'warn' ? AlertTriangle : Info;
  return (
    <div style={{ background: `${color}12`, border: `1px solid ${color}44`, borderRadius: '10px',
      padding: '12px 18px', marginBottom: '14px', fontSize: '13px', color,
      display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
};

const Pagination = ({ C, page, totalPages, total, pageSize, onPage }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: '16px', fontSize: '13px', color: C.muted, flexWrap: 'wrap', gap: '10px' }}>
    <span>Showing {fmt(Math.min((page - 1) * pageSize + 1, total))}–{fmt(Math.min(page * pageSize, total))} of {fmt(total)}</span>
    <div style={{ display: 'flex', gap: '6px' }}>
      <button style={ghostBtn(C, true)} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      <span style={{ padding: '5px 10px', fontSize: '12px' }}>{page} / {totalPages}</span>
      <button style={ghostBtn(C, true)} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  </div>
);

const StatTile = ({ C, label, value, accent, icon: Icon }) => (
  <div style={{ ...card(C), borderTop: `3px solid ${accent}`, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>{label}</div>
      <Icon size={15} color={accent} />
    </div>
    <div style={{ fontSize: '26px', fontWeight: 900, color: C.text, lineHeight: 1 }}>{value}</div>
  </div>
);

// ── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ C, navigate }) => (
  <nav style={{
    width: '220px', flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`,
    minHeight: '100vh', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '20px',
  }}>
    <div style={{ padding: '0 10px', fontSize: '15px', fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
      TaxPlan Admin
    </div>
    {NAV_GROUPS.map(group => (
      <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.dim, padding: '0 10px', marginBottom: '4px' }}>
          {group.title}
        </div>
        {group.items.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => navigate(adminUrl(item.path))} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px',
              background: item.active ? `${C.blue}1f` : 'transparent',
              color: item.active ? C.blue : C.muted, border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: item.active ? 700 : 500, textAlign: 'left', width: '100%',
            }}>
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);

// ── Email preview modal ─────────────────────────────────────────────────────
const PreviewModal = ({ C, subject, fromEmail, bodyHtml, sampleVars, onClose }) => {
  const rendered = useMemo(() => {
    let html = bodyHtml || '<p style="color:#94a3b8;font-family:sans-serif;">Nothing to preview yet — write your email body first.</p>';
    let subj = subject || '(no subject)';
    Object.entries(sampleVars || {}).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      html = html.replace(re, v);
      subj = subj.replace(re, v);
    });
    return { html, subj };
  }, [bodyHtml, subject, sampleVars]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`,
        width: '100%', maxWidth: '680px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: C.text }}>
            <Eye size={16} /> Email Preview
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontSize: '12px', color: C.muted, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div><strong style={{ color: C.text }}>From:</strong> {fromEmail || 'TaxPlanAdvisor <noreply@taxplanadvisor.in>'}</div>
          <div><strong style={{ color: C.text }}>Subject:</strong> {rendered.subj}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
          <iframe title="email-preview" srcDoc={rendered.html} style={{ width: '100%', height: '520px', border: 'none' }} sandbox="" />
        </div>
      </div>
    </div>
  );
};

// ── Merge-tag guide + chip inserter ─────────────────────────────────────────
const VariableGuide = ({ C, availableTags, onInsert }) => {
  const [open, setOpen] = useState(false);
  const tags = ['name', 'email', ...availableTags.filter(t => !['name', 'email'].includes(t))];
  return (
    <div style={{ ...card2Style(C), marginTop: '10px' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.text,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
          <HelpCircle size={14} /> Personalize with merge tags
        </span>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '8px', lineHeight: 1.5 }}>
            Click a tag to insert it into the email body. Every <code>{'{{tag}}'}</code> is replaced
            with that recipient's value when the campaign sends. <code>{'{{name}}'}</code> and{' '}
            <code>{'{{email}}'}</code> are always available; upload an Excel sheet to unlock custom
            tags (e.g. a "City" column becomes <code>{'{{City}}'}</code>).
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tags.map(t => (
              <button key={t} onClick={() => onInsert(t)} style={{
                ...badge(C, C.blue), border: `1px solid ${C.blue}44`, cursor: 'pointer', gap: '4px',
              }}>
                <Copy size={10} /> {`{{${t}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
export default function EmailBroadcast() {
  const navigate = useNavigate();
  const token = getAdminToken();
  const { isLight, toggleTheme } = useAdminTheme();
  const C = isLight ? TOKENS.light : TOKENS.dark;
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  const jsonHeaders = useMemo(() => ({ ...authHeaders, 'Content-Type': 'application/json' }), [authHeaders]);

  const [activeTab, setActiveTab] = useState('compose');
  const [actionMsg, setActionMsg] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetSession = useCallback(() => {
    clearAdminSession();
    navigate(adminUrl());
  }, [navigate]);

  useEffect(() => { if (!token && !import.meta.env.DEV) resetSession(); }, [resetSession, token]);

  const flash = (text, type = 'ok') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 6000);
  };

  // ── Compose form state ──
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [source, setSource] = useState('manual');
  const [manualEmails, setManualEmails] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [segments, setSegments] = useState({});
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [excelData, setExcelData] = useState(null); // { recipients, variable_columns, total, preview }
  const [excelUploading, setExcelUploading] = useState(false);
  const bodyRef = useRef(null);
  const subjectRef = useRef(null);
  const lastFocusedRef = useRef('body');

  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

  const addPendingFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const currentTotal = pendingFiles.reduce((sum, f) => sum + f.size, 0);
    const accepted = [];
    let total = currentTotal;
    for (const f of incoming) {
      if (total + f.size > MAX_ATTACHMENT_BYTES) {
        flash(`"${f.name}" skipped — attachments would exceed the 8MB total limit.`, 'err');
        continue;
      }
      total += f.size;
      accepted.push(f);
    }
    if (accepted.length) setPendingFiles(prev => [...prev, ...accepted]);
  };
  const removePendingFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const fetchSegments = useCallback(async () => {
    const r = await fetch(`${API_BASE}/segments/`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) setSegments(await r.json());
  }, [authHeaders, resetSession]);

  const fetchTemplates = useCallback(async () => {
    const r = await fetch(`${API_BASE}/templates/`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) setTemplates(await r.json());
  }, [authHeaders, resetSession]);

  useEffect(() => { fetchSegments(); fetchTemplates(); }, [fetchSegments, fetchTemplates]);

  const applyTemplate = (id) => {
    setSelectedTemplate(id);
    const t = templates.find(t => String(t.id) === String(id));
    if (t) { setSubject(t.subject); setBodyHtml(t.body_html); }
  };

  const resetComposeForm = () => {
    setName(''); setSubject(''); setBodyHtml(''); setSource('manual');
    setManualEmails(''); setScheduleAt(''); setSelectedTemplate('');
    setSaveAsTemplate(false); setTemplateName(''); setPendingFiles([]); setExcelData(null);
  };

  const insertVariable = (tag) => {
    const token = `{{${tag}}}`;
    if (lastFocusedRef.current === 'subject') {
      setSubject(s => s + token);
    } else {
      setBodyHtml(b => b + token);
    }
  };

  const uploadExcel = async (file) => {
    setExcelUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(`${API_BASE}/parse-excel/`, { method: 'POST', credentials: 'include', headers: authHeaders, body: form });
      const data = await r.json();
      if (!r.ok) { flash(data.error || 'Could not parse that file.', 'err'); return; }
      setExcelData(data);
      flash(`Loaded ${data.total} recipient(s) from the sheet.`);
    } catch (e) {
      flash(`Upload failed: ${e.message}`, 'err');
    } finally {
      setExcelUploading(false);
    }
  };

  const submitCampaign = async (mode) => {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      flash('Name, subject, and body are all required.', 'err'); return;
    }
    if (source === 'manual' && !manualEmails.trim()) {
      flash('Add at least one recipient email.', 'err'); return;
    }
    if (source === 'excel' && !excelData?.recipients?.length) {
      flash('Upload an Excel sheet with recipients first.', 'err'); return;
    }
    if (mode === 'schedule' && !scheduleAt) {
      flash('Pick a date/time to schedule this campaign.', 'err'); return;
    }

    setSubmitting(true);
    try {
      if (saveAsTemplate && templateName.trim()) {
        await fetch(`${API_BASE}/templates/`, {
          method: 'POST', credentials: 'include', headers: jsonHeaders,
          body: JSON.stringify({ name: templateName, subject, body_html: bodyHtml }),
        });
        fetchTemplates();
      }

      const r = await fetch(`${API_BASE}/campaigns/`, {
        method: 'POST', credentials: 'include', headers: jsonHeaders,
        body: JSON.stringify({
          name, subject, body_html: bodyHtml, recipient_source: source,
          manual_emails: manualEmails,
          excel_recipients: source === 'excel' ? excelData.recipients : undefined,
        }),
      });
      if (r.status === 401 || r.status === 403) return resetSession();
      const data = await r.json();
      if (!r.ok) { flash(data.error || 'Failed to create campaign.', 'err'); return; }

      const campaignId = data.id;

      if (pendingFiles.length) {
        const form = new FormData();
        pendingFiles.forEach(f => form.append('files', f));
        const uploadRes = await fetch(`${API_BASE}/campaigns/${campaignId}/attachments/`, {
          method: 'POST', credentials: 'include', headers: authHeaders, body: form,
        });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          flash(uploadData.error || 'Campaign created, but attachment upload failed.', 'err');
          return;
        }
      }

      if (mode === 'schedule') {
        const scheduleRes = await fetch(`${API_BASE}/campaigns/${campaignId}/schedule/`, {
          method: 'POST', credentials: 'include', headers: jsonHeaders,
          body: JSON.stringify({ scheduled_at: new Date(scheduleAt).toISOString() }),
        });
        const scheduleData = await scheduleRes.json();
        flash(scheduleData.message || 'Campaign scheduled.', scheduleRes.ok ? 'ok' : 'err');
      } else {
        const sendRes = await fetch(`${API_BASE}/campaigns/${campaignId}/send/`, {
          method: 'POST', credentials: 'include', headers: jsonHeaders,
        });
        const sendData = await sendRes.json();
        flash(sendData.message || 'Campaign is sending.', sendRes.ok ? 'ok' : 'err');
      }
      resetComposeForm();
      setActiveTab('campaigns');
    } catch (e) {
      flash(`Network error: ${e.message}`, 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Campaigns tab state ──
  const [campaigns, setCampaigns] = useState([]);
  const [campTotal, setCampTotal] = useState(0);
  const [campPage, setCampPage] = useState(1);
  const [campStatus, setCampStatus] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recTotal, setRecTotal] = useState(0);
  const [recPage, setRecPage] = useState(1);
  const [expandedAttachments, setExpandedAttachments] = useState([]);
  const PAGE_SIZE = 25;

  const fetchCampaigns = useCallback(async () => {
    const p = new URLSearchParams({ page: campPage });
    if (campStatus) p.set('status', campStatus);
    const r = await fetch(`${API_BASE}/campaigns/?${p}`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) { const d = await r.json(); setCampaigns(d.campaigns || []); setCampTotal(d.total || 0); }
  }, [campPage, campStatus, authHeaders, resetSession]);

  const fetchRecipients = useCallback(async (campaignId, page = 1) => {
    const r = await fetch(`${API_BASE}/campaigns/${campaignId}/recipients/?page=${page}`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) { const d = await r.json(); setRecipients(d.recipients || []); setRecTotal(d.total || 0); }
  }, [authHeaders, resetSession]);

  useEffect(() => { if (activeTab === 'campaigns') fetchCampaigns(); }, [activeTab, fetchCampaigns]);
  useEffect(() => {
    if (activeTab === 'campaigns') { const id = setInterval(fetchCampaigns, 20000); return () => clearInterval(id); }
  }, [activeTab, fetchCampaigns]);

  const toggleExpand = async (c) => {
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id); setRecPage(1); fetchRecipients(c.id, 1);
    const r = await fetch(`${API_BASE}/campaigns/${c.id}/attachments/`, { credentials: 'include', headers: authHeaders });
    if (r.ok) setExpandedAttachments(await r.json());
  };

  const campaignAction = async (id, actionPath, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const r = await fetch(`${API_BASE}/campaigns/${id}/${actionPath}/`, { method: 'POST', credentials: 'include', headers: authHeaders });
    const data = await r.json();
    flash(data.message || data.error || 'Done.', r.ok ? 'ok' : 'err');
    fetchCampaigns();
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign permanently?')) return;
    const r = await fetch(`${API_BASE}/campaigns/${id}/`, { method: 'DELETE', credentials: 'include', headers: authHeaders });
    const data = await r.json();
    flash(data.message || data.error || 'Done.', r.ok ? 'ok' : 'err');
    fetchCampaigns();
  };

  const testConnection = async () => {
    flash('Testing SES connection…');
    const r = await fetch(`${API_BASE}/test-connection/`, { method: 'POST', credentials: 'include', headers: authHeaders });
    const data = await r.json();
    flash(r.ok ? data.message : (data.error || 'SES connection failed.'), r.ok ? 'ok' : 'err');
  };

  // ── Templates tab state ──
  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [editingTplId, setEditingTplId] = useState(null);

  const saveTemplate = async () => {
    if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) { flash('Fill in all template fields.', 'err'); return; }
    const url = editingTplId ? `${API_BASE}/templates/${editingTplId}/` : `${API_BASE}/templates/`;
    const method = editingTplId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, credentials: 'include', headers: jsonHeaders,
      body: JSON.stringify({ name: tplName, subject: tplSubject, body_html: tplBody }) });
    if (r.ok) {
      flash(editingTplId ? 'Template updated.' : 'Template saved.');
      setTplName(''); setTplSubject(''); setTplBody(''); setEditingTplId(null);
      fetchTemplates();
    } else flash('Failed to save template.', 'err');
  };

  const editTemplate = (t) => {
    setEditingTplId(t.id); setTplName(t.name); setTplSubject(t.subject); setTplBody(t.body_html);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await fetch(`${API_BASE}/templates/${id}/`, { method: 'DELETE', credentials: 'include', headers: authHeaders });
    fetchTemplates();
  };

  // ── Reports tab state ──
  const [reports, setReports] = useState(null);
  const fetchReports = useCallback(async () => {
    const r = await fetch(`${API_BASE}/reports/`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) setReports(await r.json());
  }, [authHeaders, resetSession]);
  useEffect(() => { if (activeTab === 'reports') fetchReports(); }, [activeTab, fetchReports]);

  const recipientCountLabel = source === 'manual'
    ? `${manualEmails.split(/[\n,]/).map(s => s.trim()).filter(Boolean).length} recipient(s) entered`
    : source === 'excel'
      ? (excelData ? `${excelData.total} recipient(s) loaded from sheet` : 'No sheet uploaded yet')
      : `${fmt(segments[source] ?? '…')} recipient(s) in this segment`;

  const availableTags = source === 'excel' && excelData ? excelData.variable_columns : [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex' }}>
    <Sidebar C={C} navigate={navigate} />
    <div style={{ flex: 1, minWidth: 0, color: C.text,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", padding: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            <Send size={20} color={C.blue} /> Email Broadcast
          </h1>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>Compose, send, and report on campaigns via Amazon SES · Times in IST</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
          <button style={ghostBtn(C)} onClick={() => navigate(adminUrl('emails'))}><Mail size={14} /> Email Monitor</button>
          <button style={btn(C, C.blueD)} onClick={testConnection}><MailCheck size={14} /> Test SES</button>
        </div>
      </div>

      {actionMsg && <Alert C={C} tone={actionMsg.type === 'err' ? 'err' : 'ok'}>{actionMsg.text}</Alert>}

      <TabBar C={C}
        tabs={[
          { key: 'compose', label: 'Compose', icon: PenSquare },
          { key: 'campaigns', label: 'Campaigns', icon: ClipboardList },
          { key: 'reports', label: 'Reports', icon: BarChart3 },
          { key: 'templates', label: 'Templates', icon: FolderOpen },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ══ Compose Tab ══ */}
      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
          <div style={card(C)}>
            <label style={labelStyle(C)}>Campaign Name (internal)</label>
            <input style={{ ...inputStyle(C), marginBottom: '14px' }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. July Tax Deadline Reminder" />

            <label style={labelStyle(C)}>Load from Template (optional)</label>
            <select style={{ ...inputStyle(C), cursor: 'pointer', marginBottom: '14px' }} value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}>
              <option value="">— None —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <label style={labelStyle(C)}>Subject</label>
            <input ref={subjectRef} onFocus={() => { lastFocusedRef.current = 'subject'; }}
              style={{ ...inputStyle(C), marginBottom: '14px' }} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...labelStyle(C), marginBottom: 0 }}>Body (HTML supported)</label>
              <button onClick={() => setPreviewOpen(true)} style={ghostBtn(C, true)}><Eye size={12} /> Preview</button>
            </div>
            <textarea ref={bodyRef} onFocus={() => { lastFocusedRef.current = 'body'; }}
              style={{ ...inputStyle(C), minHeight: '220px', resize: 'vertical', fontFamily: 'monospace' }}
              value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} placeholder="<p>Hello {{name}},</p>..." />

            <VariableGuide C={C} availableTags={availableTags} onInsert={insertVariable} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
              <input type="checkbox" id="saveTpl" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} />
              <label htmlFor="saveTpl" style={{ fontSize: '13px', color: C.text, cursor: 'pointer' }}>Save this as a reusable template</label>
              {saveAsTemplate && (
                <input style={{ ...inputStyle(C), width: '220px', marginLeft: '8px' }} placeholder="Template name"
                  value={templateName} onChange={e => setTemplateName(e.target.value)} />
              )}
            </div>
          </div>

          <div style={card(C)}>
            <label style={labelStyle(C)}>Recipients</label>
            <select style={{ ...inputStyle(C), cursor: 'pointer', marginBottom: '10px' }} value={source} onChange={e => setSource(e.target.value)}>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            {source === 'manual' && (
              <textarea style={{ ...inputStyle(C), minHeight: '140px', resize: 'vertical', fontFamily: 'monospace' }}
                value={manualEmails} onChange={e => setManualEmails(e.target.value)}
                placeholder={'one@example.com\ntwo@example.com'} />
            )}

            {source === 'excel' && (
              <div>
                <label style={{ ...ghostBtn(C), display: 'inline-flex', width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
                  <Upload size={14} /> {excelUploading ? 'Uploading…' : 'Upload .xlsx sheet'}
                  <input type="file" accept=".xlsx" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) uploadExcel(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <div style={{ fontSize: '11px', color: C.muted, marginBottom: '10px', lineHeight: 1.5 }}>
                  First row = headers. Needs an <strong>Email</strong> column; an optional <strong>Name</strong>
                  column; any other columns (e.g. "City") become merge tags like <code>{'{{City}}'}</code>.
                </div>
                {excelData && (
                  <div style={{ ...card2Style(C), fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
                      <FileSpreadsheet size={13} /> {excelData.total} recipients detected
                    </div>
                    {excelData.variable_columns.length > 0 && (
                      <div style={{ marginBottom: '8px', color: C.muted }}>
                        Columns: {excelData.variable_columns.join(', ')}
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '3px 6px', color: C.muted }}>Email</th>
                            <th style={{ textAlign: 'left', padding: '3px 6px', color: C.muted }}>Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelData.preview.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '3px 6px', color: C.text }}>{r.email}</td>
                              <td style={{ padding: '3px 6px', color: C.text }}>{r.name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!['manual', 'excel'].includes(source) && (
              <div style={{ ...card2Style(C), fontSize: '12px', color: C.muted }}>
                Pulled live from the database at send time.
              </div>
            )}
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>{recipientCountLabel}</div>

            <div style={{ height: '1px', background: C.border, margin: '18px 0' }} />

            <label style={labelStyle(C)}>Attachments (optional, 8MB total)</label>
            <label style={{ ...ghostBtn(C, true), display: 'inline-flex', marginBottom: '10px' }}>
              <Paperclip size={13} /> Add file(s)
              <input type="file" multiple style={{ display: 'none' }}
                onChange={e => { addPendingFiles(e.target.files); e.target.value = ''; }} />
            </label>
            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {pendingFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} style={{ ...card2Style(C), display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
                    <span style={{ fontSize: '12px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name} <span style={{ color: C.muted }}>({(f.size / 1024).toFixed(0)} KB)</span>
                    </span>
                    <button onClick={() => removePendingFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: '1px', background: C.border, margin: '18px 0' }} />

            <label style={labelStyle(C)}>Schedule (optional)</label>
            <input type="datetime-local" style={{ ...inputStyle(C), marginBottom: '14px' }} value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button style={btn(C, C.emeraldD, false, submitting)} disabled={submitting} onClick={() => submitCampaign('send')}>
                <Send size={14} /> Send Now
              </button>
              <button style={btn(C, C.amberD, false, submitting)} disabled={submitting} onClick={() => submitCampaign('schedule')}>
                <Clock size={14} /> Schedule Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Campaigns Tab ══ */}
      {activeTab === 'campaigns' && (
        <div style={card(C)}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <select style={{ ...inputStyle(C), width: 'auto', cursor: 'pointer' }} value={campStatus} onChange={e => { setCampStatus(e.target.value); setCampPage(1); }}>
              <option value="">All Statuses</option>
              {Object.keys(C.STATUS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={ghostBtn(C, true)} onClick={fetchCampaigns}><RefreshCw size={12} /> Refresh</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Name', 'Subject', 'Source', 'Status', 'Recipients', 'Sent', 'Failed', 'Opens', 'Clicks', 'Scheduled', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontWeight: 600,
                      fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: '28px', textAlign: 'center', color: C.muted }}>No campaigns yet.</td></tr>
                ) : campaigns.map(c => (
                  <React.Fragment key={c.id}>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => toggleExpand(c)}>
                      <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '11px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.subject}>{c.subject}</td>
                      <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{SOURCE_LABELS[c.recipient_source] || c.recipient_source}</td>
                      <td style={{ padding: '11px 14px' }}><StatusBadge C={C} s={c.status} /></td>
                      <td style={{ padding: '11px 14px' }}>{fmt(c.total_recipients)}</td>
                      <td style={{ padding: '11px 14px', color: C.emerald }}>{fmt(c.sent_count)}</td>
                      <td style={{ padding: '11px 14px', color: c.failed_count > 0 ? C.red : C.muted }}>{fmt(c.failed_count)}</td>
                      <td style={{ padding: '11px 14px', color: C.blue }}>{fmt(c.unique_opens)}</td>
                      <td style={{ padding: '11px 14px', color: C.purple }}>{fmt(c.unique_clicks)}</td>
                      <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{fmtDate(c.scheduled_at)}</td>
                      <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(c.status === 'draft' || c.status === 'failed') && (
                            <button style={btn(C, C.emeraldD, true)} onClick={() => campaignAction(c.id, 'send', 'Send this campaign now?')}><Send size={11} /> Send</button>
                          )}
                          {c.status === 'scheduled' && (
                            <button style={btn(C, C.redD, true)} onClick={() => campaignAction(c.id, 'cancel')}><X size={11} /> Cancel</button>
                          )}
                          {c.status !== 'sending' && (
                            <button style={ghostBtn(C, true)} onClick={() => deleteCampaign(c.id)}><Trash2 size={11} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr>
                        <td colSpan={11} style={{ padding: '14px', background: C.surface }}>
                          {expandedAttachments.length > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: C.muted, marginBottom: '8px' }}>Attachments</div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {expandedAttachments.map(a => (
                                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{
                                    ...card2Style(C), display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '12px', color: C.text, textDecoration: 'none', padding: '6px 12px',
                                  }}>
                                    <Paperclip size={12} /> {a.original_name} <span style={{ color: C.muted }}>({(a.size / 1024).toFixed(0)} KB)</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: '12px', fontWeight: 700, color: C.muted, marginBottom: '8px' }}>Recipients</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                {['Email', 'Status', 'Sent At', 'Opened', 'Clicked', 'Error'].map(h => (
                                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.dim, fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {recipients.map(r => (
                                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: '6px 10px' }}>{r.email}</td>
                                  <td style={{ padding: '6px 10px' }}><StatusBadge C={C} s={r.status} /></td>
                                  <td style={{ padding: '6px 10px', color: C.muted }}>{fmtDate(r.sent_at)}</td>
                                  <td style={{ padding: '6px 10px', color: r.opened_at ? C.blue : C.muted }}>{r.opened_at ? `Yes (${r.open_count})` : '—'}</td>
                                  <td style={{ padding: '6px 10px', color: r.clicked_at ? C.purple : C.muted }}>{r.clicked_at ? `Yes (${r.click_count})` : '—'}</td>
                                  <td style={{ padding: '6px 10px', color: C.red }}>{r.error_message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Pagination C={C} page={recPage} totalPages={Math.max(1, Math.ceil(recTotal / PAGE_SIZE))} total={recTotal} pageSize={PAGE_SIZE}
                            onPage={(p) => { setRecPage(p); fetchRecipients(c.id, p); }} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination C={C} page={campPage} totalPages={Math.max(1, Math.ceil(campTotal / PAGE_SIZE))} total={campTotal} pageSize={PAGE_SIZE} onPage={setCampPage} />
        </div>
      )}

      {/* ══ Reports Tab ══ */}
      {activeTab === 'reports' && (
        <div>
          {!reports ? (
            <div style={{ color: C.muted, fontSize: '13px' }}>Loading reports…</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '14px', marginBottom: '22px' }}>
                <StatTile C={C} label="Campaigns Sent" value={fmt(reports.totals.campaigns)} accent={C.blue} icon={ClipboardList} />
                <StatTile C={C} label="Total Delivered" value={fmt(reports.totals.total_sent)} accent={C.emerald} icon={Send} />
                <StatTile C={C} label="Unique Opens" value={fmt(reports.totals.total_unique_opens)} accent={C.purple} icon={MailOpen} />
                <StatTile C={C} label="Open Rate" value={`${reports.totals.overall_open_rate}%`} accent={C.purple} icon={MailOpen} />
                <StatTile C={C} label="Unique Clicks" value={fmt(reports.totals.total_unique_clicks)} accent={C.amber} icon={MousePointerClick} />
                <StatTile C={C} label="Click Rate" value={`${reports.totals.overall_click_rate}%`} accent={C.amber} icon={MousePointerClick} />
              </div>

              <div style={card(C)}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
                  Campaign-wise Performance
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Campaign', 'Status', 'Sent', 'Failed', 'Opens', 'Open Rate', 'Clicks', 'Click Rate', 'Sent At'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontWeight: 600,
                            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.campaigns.length === 0 ? (
                        <tr><td colSpan={9} style={{ padding: '28px', textAlign: 'center', color: C.muted }}>No sent campaigns yet.</td></tr>
                      ) : reports.campaigns.map(r => (
                        <tr key={r.campaign_id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.campaign_name}</td>
                          <td style={{ padding: '10px 14px' }}><StatusBadge C={C} s={r.status} /></td>
                          <td style={{ padding: '10px 14px', color: C.emerald }}>{fmt(r.sent)}</td>
                          <td style={{ padding: '10px 14px', color: r.failed > 0 ? C.red : C.muted }}>{fmt(r.failed)}</td>
                          <td style={{ padding: '10px 14px', color: C.blue }}>{fmt(r.unique_opens)}</td>
                          <td style={{ padding: '10px 14px' }}>{r.open_rate}%</td>
                          <td style={{ padding: '10px 14px', color: C.purple }}>{fmt(r.unique_clicks)}</td>
                          <td style={{ padding: '10px 14px' }}>{r.click_rate}%</td>
                          <td style={{ padding: '10px 14px', color: C.muted, fontSize: '12px' }}>{fmtDate(r.sent_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ Templates Tab ══ */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div style={card(C)}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
              {editingTplId ? 'Edit Template' : 'New Template'}
            </div>
            <label style={labelStyle(C)}>Name</label>
            <input style={{ ...inputStyle(C), marginBottom: '12px' }} value={tplName} onChange={e => setTplName(e.target.value)} />
            <label style={labelStyle(C)}>Subject</label>
            <input style={{ ...inputStyle(C), marginBottom: '12px' }} value={tplSubject} onChange={e => setTplSubject(e.target.value)} />
            <label style={labelStyle(C)}>Body (HTML)</label>
            <textarea style={{ ...inputStyle(C), minHeight: '180px', resize: 'vertical', fontFamily: 'monospace', marginBottom: '12px' }}
              value={tplBody} onChange={e => setTplBody(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btn(C, C.emeraldD)} onClick={saveTemplate}>{editingTplId ? 'Update' : 'Save'} Template</button>
              {editingTplId && (
                <button style={ghostBtn(C)} onClick={() => { setEditingTplId(null); setTplName(''); setTplSubject(''); setTplBody(''); }}>Cancel</button>
              )}
            </div>
          </div>

          <div style={card(C)}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
              Saved Templates
            </div>
            {templates.length === 0 ? (
              <div style={{ color: C.muted, fontSize: '13px' }}>No templates yet.</div>
            ) : templates.map(t => (
              <div key={t.id} style={{ ...card2Style(C), display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: C.muted }}>{t.subject}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={ghostBtn(C, true)} onClick={() => editTemplate(t)}>Edit</button>
                  <button style={btn(C, C.redD, true)} onClick={() => deleteTemplate(t.id)}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    {previewOpen && (
      <PreviewModal C={C} subject={subject} fromEmail="" bodyHtml={bodyHtml}
        sampleVars={{ name: 'John Doe', email: 'john@example.com', ...Object.fromEntries((excelData?.variable_columns || []).map(v => [v, `Sample ${v}`])) }}
        onClose={() => setPreviewOpen(false)} />
    )}
    </div>
  );
}
