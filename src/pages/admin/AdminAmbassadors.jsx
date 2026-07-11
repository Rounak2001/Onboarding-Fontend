import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchPMAmbassadors,
  pmActivateAmbassador,
  pmSuspendAmbassador,
  pmToggleCoupon,
  pmRegenerateCertificate,
  fetchPMQuizAttempts,
  fetchPMDailyReports,
  fetchPMModuleProgress,
  fetchPMAmbassadorCallLogs,
  pmSaveAmbassadorCallTracking,
} from '../../services/ambassadorApi';
import {
  Users, Search, Download, Send, CheckCircle2, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Shield, FileSpreadsheet, MessageSquare, ToggleLeft,
  ToggleRight, Loader2, Check, Copy, UserCheck, UserX, Award,
  Trophy, Eye, X, GraduationCap, FileCheck, Tag, MapPin, Phone, Bell,
} from 'lucide-react';

const CALL_STATUS_OPTIONS = [
  { value: '', label: 'Not Set' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'no-answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'ringing', label: 'Ringing' },
  { value: 'initiated', label: 'Initiated' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Active', predicate: (a) => a.isActive },
  { value: 'inactive', label: 'Inactive', predicate: (a) => !a.isActive },
  { value: 'pending_kyc', label: 'Pending KYC', predicate: (a) => a.kycStatus === 'pending' },
  { value: 'verified', label: 'Verified', predicate: (a) => a.kycStatus === 'verified' },
  { value: 'training_incomplete', label: 'Training Incomplete', predicate: (a) => !a.trainingCompleted },
  { value: 'interested', label: 'Interested', predicate: (a) => a.interestStatus === 'interested' },
  { value: 'not_interested', label: 'Not Interested', predicate: (a) => a.interestStatus === 'not_interested' },
  { value: 'no_status', label: 'No Status', predicate: (a) => !a.interestStatus },
];

const buildAmbassadorCallDraft = () => ({
  caller_id: '', call_status: '', interest_status: '',
  comments: '', issue_facing: '', next_follow_up: '',
});

const WHATSAPP_TEMPLATES = [
  {
    id: 'TMP-001', name: 'Activation Welcome', category: 'activation',
    message: "🎉 Congratulations {{name}}! You're now an official Taxplan Campus Ambassador! Your unique coupon code is {{coupon}}. Start sharing and earn up to 12% commission. Download the app: taxplan.app/download",
    variables: ['name', 'coupon'],
  },
  {
    id: 'TMP-002', name: 'Referral Converted', category: 'referral_converted',
    message: "🌟 Great news {{name}}! A customer you referred ({{customer}}) has completed their tax filing. You've earned ₹{{commission}} in commission. Keep sharing your code {{coupon}}!",
    variables: ['name', 'customer', 'commission', 'coupon'],
  },
  {
    id: 'TMP-003', name: 'Payout Processed', category: 'payout_processed',
    message: '💰 Your monthly payout of ₹{{amount}} for {{month}} has been processed! TDS of ₹{{tds}} has been deducted. Check your payout details in the ambassador portal.',
    variables: ['name', 'amount', 'month', 'tds'],
  },
  {
    id: 'TMP-004', name: 'Weekly Leaderboard', category: 'weekly_leaderboard',
    message: "🏆 Weekly Leaderboard Update! You're currently ranked #{{rank}} with {{referrals}} referrals this week. The top ambassador this week is {{top_name}} with {{top_referrals}} referrals! Keep pushing!",
    variables: ['name', 'rank', 'referrals', 'top_name', 'top_referrals'],
  },
];

// ── Tiny shared primitives ──────────────────────────────────────────────────

// Badge color recipe: rgba background + solid hex text, matching the
// AdminClientList status-pill convention (padding 3px 8px, radius 12, fontSize 10/700).
const BADGE_COLORS = {
  gray: { background: 'var(--admin-surface-strong)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)' },
  green: { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' },
  red: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  amber: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' },
  blue: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' },
  purple: { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' },
};

function Badge({ children, color = 'gray', size = 'sm' }) {
  const c = BADGE_COLORS[color] || BADGE_COLORS.gray;
  const isXs = size === 'xs';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isXs ? '2px 7px' : '4px 9px',
        fontSize: isXs ? 10 : 11,
        fontWeight: 700,
        borderRadius: 6,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        lineHeight: 1.5,
        background: c.background,
        color: c.color,
        border: c.border,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminAmbassadors({ isLight, viewportWidth, token, themeVars }) {
  const isMobile = viewportWidth <= 768;
  const isNarrowMobile = viewportWidth <= 430;
  const isCompact = viewportWidth <= 1200; // compact table badges when viewport is tight

  const [ambassadors, setAmbassadors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('ambassadors');
  const [statusFilters, setStatusFilters] = useState([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('referrals');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [broadcastTemplate, setBroadcastTemplate] = useState('TMP-001');
  const [showConfirm, setShowConfirm] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [kycDrawerId, setKycDrawerId] = useState(null);

  const [kycActionLoading, setKycActionLoading] = useState(null);
  const [kycActionError, setKycActionError] = useState(null);
  const [kycActionSuccess, setKycActionSuccess] = useState(null);
  const [kycDrawerTab, setKycDrawerTab] = useState('kyc');

  const [pmQuizAttempts, setPmQuizAttempts] = useState([]);
  const [pmDailyReports, setPmDailyReports] = useState(null);
  const [pmModuleProgress, setPmModuleProgress] = useState(null);
  const [pmReportsLoading, setPmReportsLoading] = useState(false);
  const [pmProgressLoading, setPmProgressLoading] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState(null);

  const [pmCallerOptions, setPmCallerOptions] = useState([]);
  const [pmCallLogs, setPmCallLogs] = useState([]);
  const [pmCallLogsLoading, setPmCallLogsLoading] = useState(false);
  const [callTrackingDraft, setCallTrackingDraft] = useState(buildAmbassadorCallDraft());
  const [savingCallTracking, setSavingCallTracking] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const [broadcastLists, setBroadcastLists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tp_admin_broadcasts') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('tp_admin_broadcasts', JSON.stringify(broadcastLists));
  }, [broadcastLists]);

  const loadAmbassadors = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchPMAmbassadors();
      setAmbassadors(data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load ambassadors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAmbassadors(); }, []);

  // Lock the underlying page while the profile drawer is open so scrolling
  // inside the drawer's own panel never moves the list behind it — without
  // this, the list would land at a different scroll position once closed.
  useEffect(() => {
    if (!kycDrawerId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [kycDrawerId]);

  useEffect(() => {
    if (!kycDrawerId) return;
    const numId = parseInt(kycDrawerId, 10);
    setKycDrawerTab('kyc');
    setPmQuizAttempts([]); setPmDailyReports(null); setPmModuleProgress(null); setExpandedModuleId(null);
    setPmReportsLoading(true); setPmProgressLoading(true);
    fetchPMQuizAttempts(numId).then(setPmQuizAttempts).catch(() => { });
    fetchPMDailyReports(numId).then(setPmDailyReports).catch(() => { }).finally(() => setPmReportsLoading(false));
    fetchPMModuleProgress(numId).then(setPmModuleProgress).catch(() => { }).finally(() => setPmProgressLoading(false));

    setPmCallLogs([]); setPmCallerOptions([]); setCallTrackingDraft(buildAmbassadorCallDraft());
    setPmCallLogsLoading(true);
    fetchPMAmbassadorCallLogs(numId)
      .then(d => { setPmCallerOptions(d.caller_options || []); setPmCallLogs(d.call_logs || []); })
      .catch(() => { })
      .finally(() => setPmCallLogsLoading(false));
  }, [kycDrawerId]);

  const handleSaveAmbassadorCallTracking = async () => {
    if (!kycDrawerId) return;
    const numId = parseInt(kycDrawerId, 10);
    setSavingCallTracking(true);
    try {
      const data = await pmSaveAmbassadorCallTracking(numId, callTrackingDraft);
      if (data?.call_log) setPmCallLogs(prev => [data.call_log, ...prev]);
      if (data?.interest_status) {
        setAmbassadors(prev => prev.map(a => a.id === kycDrawerId ? { ...a, interestStatus: data.interest_status } : a));
      }
      setCallTrackingDraft(buildAmbassadorCallDraft());
      alert(data?.message || 'Call entry added successfully.');
    } catch (err) {
      alert(err.message || 'Failed to save call tracking');
    } finally {
      setSavingCallTracking(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const leaderboard = useMemo(() => {
    return [...ambassadors]
      .filter(a => a.isActive)
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 50)
      .map((a, i) => ({
        rank: i + 1, ambassadorId: a.id, name: a.name, college: a.college,
        referrals: a.totalReferrals, revenue: a.totalReferrals * 12000, commission: a.totalCommission,
      }));
  }, [ambassadors]);

  const kycAmbassador = useMemo(() => kycDrawerId ? ambassadors.find(a => a.id === kycDrawerId) ?? null : null, [kycDrawerId, ambassadors]);

  const filteredAmbassadors = useMemo(() => {
    let r = [...ambassadors];
    if (statusFilters.length > 0) {
      const predicates = STATUS_FILTER_OPTIONS.filter(o => statusFilters.includes(o.value)).map(o => o.predicate);
      r = r.filter(a => predicates.some(p => p(a)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(a =>
        a.name.toLowerCase().includes(q) || a.college.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'referrals') cmp = a.totalReferrals - b.totalReferrals;
      else if (sortBy === 'earnings') cmp = a.totalCommission - b.totalCommission;
      else if (sortBy === 'joined') cmp = (a.joinedAt || '').localeCompare(b.joinedAt || '');
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return r;
  }, [ambassadors, statusFilters, searchQuery, sortBy, sortOrder]);

  const adminStats = useMemo(() => {
    const total = ambassadors.length;
    const active = ambassadors.filter(a => a.isActive).length;
    return {
      total, active, inactive: total - active,
      pendingKyc: ambassadors.filter(a => a.kycStatus === 'pending' || a.kycStatus === 'rejected').length,
      trainingIncomplete: ambassadors.filter(a => !a.trainingCompleted).length,
      totalReferrals: ambassadors.reduce((s, a) => s + a.totalReferrals, 0),
      totalPayouts: ambassadors.reduce((s, a) => s + a.totalCommission, 0),
    };
  }, [ambassadors]);

  // Stat tile recipe, matching AdminClientList's summaryCards gradient/accent convention.
  const statCards = useMemo(() => ([
    {
      key: 'total', label: 'Total Ambassadors', value: adminStats.total,
      accent: isLight ? '#64748B' : '#94A3B8',
      border: isLight ? 'rgba(100,116,139,0.30)' : 'rgba(148,163,184,0.35)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(24,35,56,0.95) 100%)',
    },
    {
      key: 'active', label: 'Active', value: adminStats.active,
      accent: isLight ? '#059669' : '#34D399',
      border: isLight ? 'rgba(5,150,105,0.30)' : 'rgba(16,185,129,0.30)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,253,245,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(12,44,42,0.92) 100%)',
    },
    {
      key: 'inactive', label: 'Inactive', value: adminStats.inactive,
      accent: isLight ? '#DC2626' : '#FB7185',
      border: isLight ? 'rgba(220,38,38,0.30)' : 'rgba(251,113,133,0.30)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,241,242,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(41,22,36,0.92) 100%)',
    },
    {
      key: 'pendingKyc', label: 'Pending KYC', value: adminStats.pendingKyc,
      accent: isLight ? '#D97706' : '#FBBF24',
      border: isLight ? 'rgba(217,119,6,0.32)' : 'rgba(251,191,36,0.32)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(54,39,16,0.92) 100%)',
    },
    {
      key: 'totalReferrals', label: 'Total Referrals', value: adminStats.totalReferrals,
      accent: isLight ? '#7C3AED' : '#C084FC',
      border: isLight ? 'rgba(124,58,237,0.30)' : 'rgba(192,132,252,0.30)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,245,255,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(45,24,68,0.92) 100%)',
    },
    {
      key: 'totalPayouts', label: 'Total Payouts', value: `₹${(adminStats.totalPayouts / 100000).toFixed(1)}L`,
      accent: isLight ? '#2563EB' : '#60A5FA',
      border: isLight ? 'rgba(37,99,235,0.30)' : 'rgba(96,165,250,0.30)',
      background: isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,246,255,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(18,35,73,0.92) 100%)',
    },
  ]), [adminStats, isLight]);

  const recipients = useMemo(() =>
    ambassadors.filter(a => a.isActive).map(a => ({
      ambassadorId: a.id, name: a.name, phone: a.phone, college: a.college, tier: a.tier, isActive: a.isActive,
    })),
    [ambassadors]);

  const [selectedRecipients, setSelectedRecipients] = useState(new Set());
  useEffect(() => {
    if (recipients.length > 0 && selectedRecipients.size === 0)
      setSelectedRecipients(new Set(recipients.map(r => r.ambassadorId)));
  }, [recipients]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleActive = (id) => {
    const a = ambassadors.find(a => a.id === id);
    if (a) setShowConfirm({ id, name: a.name, action: a.isActive ? 'deactivate' : 'activate' });
  };

  const confirmToggle = async () => {
    if (!showConfirm) return;
    try {
      const numId = parseInt(showConfirm.id, 10);
      showConfirm.action === 'activate' ? await pmActivateAmbassador(numId) : await pmSuspendAmbassador(numId, 'Suspended by admin');
      setAmbassadors(prev => prev.map(a => a.id === showConfirm.id ? { ...a, isActive: showConfirm.action === 'activate' } : a));
    } catch (err) { setError(err.message || 'Action failed.'); }
    setShowConfirm(null);
  };

  const handleKycActivate = async (id) => {
    setKycActionLoading('activate'); setKycActionError(null); setKycActionSuccess(null);
    try {
      await pmActivateAmbassador(parseInt(id, 10));
      setKycActionSuccess('Ambassador activated successfully.');
      setAmbassadors(prev => prev.map(a => a.id === id ? { ...a, isActive: true } : a));
    } catch (e) { setKycActionError(e.message || 'Activation failed.'); }
    finally { setKycActionLoading(null); }
  };

  const handleToggleCoupon = async (id, nextActive) => {
    setKycActionLoading('coupon'); setKycActionError(null); setKycActionSuccess(null);
    try {
      await pmToggleCoupon(parseInt(id, 10), nextActive);
      setAmbassadors(prev => prev.map(a => a.id === id ? { ...a, couponActive: nextActive } : a));
      setKycActionSuccess(nextActive ? 'Coupon resumed.' : 'Coupon paused.');
    } catch (e) { setKycActionError(e.message || 'Coupon toggle failed.'); }
    finally { setKycActionLoading(null); }
  };

  const handleSendBroadcast = () => {
    const template = WHATSAPP_TEMPLATES.find(t => t.id === broadcastTemplate);
    if (!template || !selectedRecipients.size) return;
    setBroadcastLists(prev => [...prev, {
      id: `BC-${Date.now()}`, templateId: template.id, templateName: template.name,
      recipients: recipients.filter(r => selectedRecipients.has(r.ambassadorId)),
      createdAt: new Date().toISOString(), sentAt: new Date().toISOString(), sentCount: selectedRecipients.size,
    }]);
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const toggleRecipient = (id) => {
    const next = new Set(selectedRecipients);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedRecipients(next);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getBroadcastPreview = (templateId) => {
    const t = WHATSAPP_TEMPLATES.find(t => t.id === templateId);
    if (!t) return '';
    return t.message
      .replace('{{name}}', '[Ambassador Name]').replace('{{coupon}}', '[Coupon Code]')
      .replace('{{customer}}', '[Customer Name]').replace('{{commission}}', '[Amount]')
      .replace('{{amount}}', '[Payout Amount]').replace('{{month}}', '[Month]')
      .replace('{{tds}}', '[TDS Amount]').replace('{{rank}}', '[Rank]')
      .replace('{{referrals}}', '[Count]').replace('{{top_name}}', '[Top Ambassador]')
      .replace('{{top_referrals}}', '[Top Count]');
  };

  const kycStatusBadge = (status, compact = false) => {
    const map = {
      verified: ['green', <CheckCircle2 size={12} />],
      pending: ['amber', <Clock size={12} />],
      rejected: ['red', <XCircle size={12} />],
    };
    const [color, icon] = map[status] || ['gray', null];
    return (
      <Badge color={color}>
        {icon}
        {!compact && <span style={{ marginLeft: 2 }}>{status}</span>}
      </Badge>
    );
  };

  const trainingStatusBadge = (completed, compact = false) => {
    return completed
      ? <Badge color="green"><CheckCircle2 size={12} />{!compact && <span style={{ marginLeft: 2 }}>Done</span>}</Badge>
      : <Badge color="gray"><Clock size={12} />{!compact && <span style={{ marginLeft: 2 }}>Pending</span>}</Badge>;
  };

  const activeStatusBadge = (isActive, compact = false) => {
    return isActive
      ? <Badge color="green"><CheckCircle2 size={12} />{!compact && <span style={{ marginLeft: 2 }}>Active</span>}</Badge>
      : <Badge color="red"><XCircle size={12} />{!compact && <span style={{ marginLeft: 2 }}>Inactive</span>}</Badge>;
  };

  const tierBadge = (tier, compact = false) => {
    const colors = ['', 'blue', 'purple', 'amber'];
    if (compact) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 6,
          fontSize: 11, fontWeight: 800,
          background: BADGE_COLORS[colors[tier] || 'gray'].background,
          color: BADGE_COLORS[colors[tier] || 'gray'].color,
          border: BADGE_COLORS[colors[tier] || 'gray'].border,
          flexShrink: 0,
        }}>
          {tier}
        </span>
      );
    }
    return <Badge color={colors[tier] || 'gray'}><Award size={12} /> Tier {tier}</Badge>;
  };

  const exportCSV = (headers, rows, filename) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  };

  // Shared "surface card" recipe used for the alert banners / broadcast tab / export tab.
  const cardStyle = {
    background: 'var(--admin-surface-strong)',
    border: '1px solid var(--admin-border-soft)',
    borderRadius: 18,
    boxShadow: isLight ? '0 18px 40px rgba(148,163,184,0.12)' : 'none',
  };

  return (
    <div
      className="animate-fade-in-up min-h-full"
      style={{ ...themeVars, background: 'var(--admin-page-bg)', color: 'var(--admin-text-primary)', padding: isMobile ? '14px' : '28px 32px', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 22 }}>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--admin-text-strong)' }}>Program Manager</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-secondary)' }}>Manage ambassadors, broadcasts, and data exports</p>
          </div>
          <div
            className="flex items-center gap-2 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-auto"
            style={{
              padding: '10px 16px',
              background: 'rgba(168,85,247,0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168,85,247,0.25)',
              letterSpacing: '0.02em',
            }}
          >
            <Shield size={14} />
            Admin Access
          </div>
        </div>

        {loading && ambassadors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ color: 'var(--admin-text-muted)' }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: '#c084fc' }} />
              </div>
            </div>
            <p className="text-sm font-medium">Loading ambassador data…</p>
          </div>
        ) : (
          <>
            {/* ── Stats Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrowMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fit, minmax(210px,1fr))', gap: isMobile ? 10 : 14 }}>
              {statCards.map((card) => (
                <div
                  key={card.key}
                  style={{
                    minHeight: isMobile ? 90 : 108,
                    borderRadius: 18,
                    border: `1px solid ${card.border}`,
                    background: card.background,
                    boxShadow: isLight
                      ? '0 18px 36px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    padding: isMobile ? '12px 12px 10px' : '18px 18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: isLight ? '#64748b' : '#6f89b4' }}>
                      {card.label}
                    </span>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: card.accent, boxShadow: `0 0 0 8px ${card.accent}1c`, flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: isMobile ? 24 : 32, lineHeight: 1, fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '-0.03em' }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div
              className="flex p-1 rounded-2xl"
              style={{
                background: isLight ? 'rgba(241,245,249,0.9)' : 'rgba(15,23,42,0.6)',
                border: `1px solid ${isLight ? 'rgba(203,213,225,0.8)' : 'rgba(51,65,85,0.6)'}`,
                gap: 4,
                boxShadow: isLight
                  ? 'inset 0 1px 3px rgba(148,163,184,0.15)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {[
                { id: 'ambassadors', label: 'Ambassadors', icon: Users },
                { id: 'broadcast', label: 'WhatsApp Broadcast', icon: MessageSquare },
                { id: 'export', label: 'Data Export', icon: FileSpreadsheet },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                    style={{
                      padding: isMobile ? '9px 10px' : '10px 18px',
                      minWidth: 0,
                      ...(isActive
                        ? {
                          background: isLight
                            ? '#ffffff'
                            : 'rgba(168,85,247,0.20)',
                          color: isLight ? '#7c3aed' : '#c084fc',
                          border: isLight
                            ? '1px solid rgba(168,85,247,0.20)'
                            : '1px solid rgba(168,85,247,0.35)',
                          boxShadow: isLight
                            ? '0 1px 4px rgba(0,0,0,0.10), 0 2px 10px rgba(124,58,237,0.08)'
                            : '0 1px 4px rgba(0,0,0,0.35)',
                        }
                        : {
                          background: 'transparent',
                          color: 'var(--admin-text-secondary)',
                          border: '1px solid transparent',
                        }),
                    }}
                  >
                    <tab.icon size={15} style={{ flexShrink: 0 }} />
                    {!isNarrowMobile && <span>{tab.label}</span>}
                    {isNarrowMobile && <span className="text-xs">{tab.id === 'ambassadors' ? 'Ambassadors' : tab.id === 'broadcast' ? 'Broadcast' : 'Export'}</span>}
                  </button>
                );
              })}
            </div>

            {/* ── Error Banner ── */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <AlertCircle size={18} className="shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={loadAmbassadors} className="font-semibold underline">Retry</button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB: Ambassadors
            ══════════════════════════════════════════════════ */}
            {activeTab === 'ambassadors' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>

                {/* Filters card */}
                <div style={{ ...cardStyle, padding: isMobile ? 14 : '14px 20px' }}>
                  {/* Row 1: Search + Filter pills */}
                  <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                    <div className="relative w-full xl:w-auto xl:flex-1 xl:max-w-xs">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search name, college, email, or ID…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full outline-none transition-all"
                        style={{ padding: '10px 14px 10px 36px', borderRadius: 10, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', color: 'var(--admin-text-strong)', fontSize: 13, height: 40, boxSizing: 'border-box' }}
                      />
                    </div>
                    {/* Status filter — multi-select dropdown */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setStatusFilterOpen(o => !o)}
                        className="flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all"
                        style={{
                          height: 40, padding: '0 14px', borderRadius: 10, boxSizing: 'border-box',
                          ...(statusFilters.length > 0
                            ? { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.35)' }
                            : { background: 'var(--admin-surface-strong)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)' }),
                        }}
                      >
                        <span>{statusFilters.length === 0 ? 'All Statuses' : `${statusFilters.length} Filter${statusFilters.length > 1 ? 's' : ''} Selected`}</span>
                        <ChevronDown size={14} style={{ transform: statusFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>

                      {statusFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setStatusFilterOpen(false)} />
                          <div
                            className="absolute right-0 z-40"
                            style={{
                              top: 46, width: 240, borderRadius: 12, overflow: 'hidden',
                              background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                            }}
                          >
                            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 6 }}>
                              {STATUS_FILTER_OPTIONS.map(opt => {
                                const checked = statusFilters.includes(opt.value);
                                return (
                                  <label
                                    key={opt.value}
                                    className="flex items-center gap-2 cursor-pointer"
                                    style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--admin-text-secondary)' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--admin-tab-idle)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setStatusFilters(prev => checked ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                                    />
                                    {opt.label}
                                  </label>
                                );
                              })}
                            </div>
                            {statusFilters.length > 0 && (
                              <button
                                onClick={() => setStatusFilters([])}
                                className="w-full text-xs font-bold"
                                style={{ padding: '10px', borderTop: '1px solid var(--admin-border-soft)', color: '#f87171', background: 'transparent' }}
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Sort controls — compact, sits below search row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-muted)', marginRight: 2 }}>Sort:</span>
                    {['name', 'referrals', 'earnings', 'joined'].map(s => (
                      <button
                        key={s}
                        onClick={() => sortBy === s ? setSortOrder(o => o === 'desc' ? 'asc' : 'desc') : (setSortBy(s), setSortOrder('desc'))}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', border: 'none',
                          ...(sortBy === s
                            ? { background: 'rgba(168,85,247,0.12)', color: '#c084fc' }
                            : { background: 'transparent', color: 'var(--admin-text-muted)' }),
                        }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {sortBy === s && (sortOrder === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambassador table */}
                <div>
                  {/* Desktop header */}
                  <div
                    className="hidden lg:grid"
                    style={{
                      gridTemplateColumns: '3fr 2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr',
                      gap: 12,
                      padding: '0 24px',
                      height: 36,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--admin-text-muted)',
                      borderBottom: '1px solid var(--admin-border-soft)',
                      alignItems: 'center',
                    }}
                  >
                    <span>Ambassador</span>
                    <span>College</span>
                    <span style={{ textAlign: 'center' }}>Tier</span>
                    <span style={{ textAlign: 'center' }}>Refs</span>
                    <span style={{ textAlign: 'right' }}>Earnings</span>
                    <span style={{ textAlign: 'center' }}>KYC</span>
                    <span style={{ textAlign: 'center' }}>Training</span>
                    <span style={{ textAlign: 'center' }}>Status</span>
                    <span style={{ textAlign: 'center' }}>Actions</span>
                  </div>

                  <div>
                    {filteredAmbassadors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--admin-text-muted)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--admin-tab-idle)' }}>
                          <Users size={24} />
                        </div>
                        <p className="font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>No ambassadors match your filters</p>
                        <button onClick={() => { setStatusFilters([]); setSearchQuery(''); }} className="text-sm font-medium hover:underline" style={{ color: '#c084fc' }}>
                          Clear filters
                        </button>
                      </div>
                    ) : filteredAmbassadors.map((a, i) => {
                      const isExpanded = expandedId === a.id;
                      const openDrawer = () => { setKycDrawerId(a.id); setKycActionError(null); setKycActionSuccess(null); };
                      return (
                        <div
                          key={a.id}
                          style={{
                            background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)',
                            borderBottom: '1px solid rgba(148,163,184,0.06)',
                          }}
                        >
                          {/* Row */}
                          <div
                            className="hidden lg:grid group"
                            style={{
                              gridTemplateColumns: '3fr 2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr',
                              gap: 12,
                              padding: '0 24px',
                              cursor: 'pointer',
                              height: 52,
                              alignItems: 'center',
                            }}
                            onClick={openDrawer}
                          >
                            {/* Avatar + name + inline Eye */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 32, height: 32, borderRadius: '50%',
                                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                                  ...(a.isActive
                                    ? { background: '#7c3aed', color: '#fff' }
                                    : { background: 'var(--admin-tab-idle)', color: 'var(--admin-text-secondary)' }),
                                }}
                              >
                                {a.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                    {a.name}
                                  </p>
                                  <span
                                    onClick={openDrawer}
                                    title="View profile"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                      background: 'rgba(99,102,241,0.12)', color: '#818cf8', cursor: 'pointer',
                                    }}
                                  >
                                    <Eye size={10} />
                                  </span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                  {a.email}
                                </p>
                              </div>
                            </div>

                            {/* College */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                              <MapPin size={11} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.college}</span>
                            </div>

                            {/* Tier */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {tierBadge(a.tier, isCompact)}
                            </div>

                            {/* Refs */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{a.totalReferrals}</span>
                            </div>

                            {/* Earnings */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 600, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                              ₹{a.totalCommission.toLocaleString()}
                            </div>

                            {/* KYC */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {kycStatusBadge(a.kycStatus, isCompact)}
                            </div>

                            {/* Training */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {trainingStatusBadge(a.trainingCompleted, isCompact)}
                            </div>

                            {/* Status */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {activeStatusBadge(a.isActive, isCompact)}
                            </div>

                            {/* Actions — icon-only toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleActive(a.id)}
                                title={a.isActive ? 'Deactivate' : 'Activate'}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 32, height: 32, borderRadius: 8, cursor: 'pointer', border: 'none',
                                  background: a.isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                  color: a.isActive ? '#f87171' : '#34d399',
                                }}
                              >
                                {a.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                            </div>
                          </div>

                          {/* Mobile row */}
                          <div
                            className="lg:hidden grid grid-cols-2 gap-3 px-4 py-4 items-center"
                            style={{ cursor: 'pointer', minHeight: 64 }}
                            onClick={openDrawer}
                          >
                            {/* Avatar + info — mobile */}
                            <div className="col-span-1 flex items-center gap-2 min-w-0">
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 30, height: 30, borderRadius: '50%',
                                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                                  ...(a.isActive
                                    ? { background: '#7c3aed', color: '#fff' }
                                    : { background: 'var(--admin-tab-idle)', color: 'var(--admin-text-secondary)' }),
                                }}
                              >
                                {a.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text-strong)' }}>{a.name}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>{a.email}</p>
                              </div>
                            </div>

                            {/* Mobile actions */}
                            <div className="col-span-1 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={openDrawer}
                                title="View profile"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                                  background: 'rgba(99,102,241,0.12)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99,102,241,0.25)',
                                  flexShrink: 0,
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleToggleActive(a.id)}
                                title={a.isActive ? 'Deactivate' : 'Activate'}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                                  background: a.isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                  color: a.isActive ? '#f87171' : '#34d399',
                                  border: a.isActive ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
                                  flexShrink: 0,
                                }}
                              >
                                {a.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                              </button>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : a.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                                  background: 'var(--admin-tab-idle)',
                                  color: 'var(--admin-text-secondary)',
                                  border: '1px solid var(--admin-border-soft)',
                                  flexShrink: 0,
                                }}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Mobile expanded row */}
                          {isExpanded && (
                            <div className="lg:hidden px-5 pb-4 pt-2" style={{ background: 'var(--admin-surface-soft)', borderTop: '1px solid var(--admin-border-soft)' }} onClick={(e) => e.stopPropagation()}>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                  ['College', `${a.college}, ${a.city}`],
                                  ['Phone', a.phone],
                                  ['Referrals', a.totalReferrals],
                                  ['Earnings', `₹${a.totalCommission.toLocaleString()}`],
                                  ['Joined', a.joinedAt ? new Date(a.joinedAt).toLocaleDateString() : '—'],
                                ].map(([k, v]) => (
                                  <div key={k}>
                                    <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>{k}</p>
                                    <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{v}</p>
                                  </div>
                                ))}
                                <div>
                                  <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>KYC</p>
                                  {kycStatusBadge(a.kycStatus)}
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>Training</p>
                                  <Badge color={a.trainingCompleted ? 'green' : 'amber'}>
                                    {a.trainingCompleted ? <><CheckCircle2 size={11} /> Done</> : <><Clock size={11} /> Pending</>}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Footer Summary ── */}
                {(() => {
                  const tenDaysAgo = new Date(Date.now() - 10 * 864e5);
                  const zeroRefs = ambassadors.filter(a => a.isActive && a.totalReferrals === 0 && new Date(a.joinedAt) < tenDaysAgo).length;
                  const pendingKyc = ambassadors.filter(a => a.kycStatus === 'pending').length;
                  const incompleteTrain = ambassadors.filter(a => !a.trainingCompleted && a.isActive).length;
                  return (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                      gap: 10, padding: '10px 16px', borderRadius: 14,
                      background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)',
                    }}>
                      {/* Count */}
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                        Showing <strong style={{ color: 'var(--admin-text-primary)' }}>{filteredAmbassadors.length}</strong> of <strong style={{ color: 'var(--admin-text-primary)' }}>{ambassadors.length}</strong> ambassadors
                      </span>
                      {/* Alert pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {zeroRefs > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                            <AlertCircle size={11} />
                            {zeroRefs} active ambassador{zeroRefs > 1 ? 's' : ''} with 0 referrals in 10+ days
                          </span>
                        )}
                        {pendingKyc > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                            <Clock size={11} />
                            {pendingKyc} ambassador{pendingKyc > 1 ? 's' : ''} waiting for KYC review
                          </span>
                        )}
                        {incompleteTrain > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <XCircle size={11} />
                            {incompleteTrain} active ambassador{incompleteTrain > 1 ? 's' : ''} with incomplete training
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB: WhatsApp Broadcast
            ══════════════════════════════════════════════════ */}
            {activeTab === 'broadcast' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-3 space-y-5">

                  {/* Template Card */}
                  <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>

                    {/* Card header strip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--admin-border-soft)', background: 'rgba(37,211,102,0.04)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(37,211,102,0.15)', color: '#25d366' }}>
                        <MessageSquare size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 2 }}>WhatsApp Broadcast</h2>
                        <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Select a pre-approved template and preview before sending</p>
                      </div>
                      {/* Live indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, flexShrink: 0, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#25d366' }}>Live</span>
                      </div>
                    </div>

                    <div style={{ padding: '24px 24px 20px' }}>

                      {/* Template picker */}
                      <div style={{ marginBottom: 28 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--admin-text-muted)', letterSpacing: '0.10em' }}>Select Template</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--admin-border-soft)' }} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {WHATSAPP_TEMPLATES.map(t => {
                            const active = broadcastTemplate === t.id;
                            const catColors = {
                              activation: { bg: 'rgba(37,211,102,0.12)', border: 'rgba(37,211,102,0.35)', text: '#25d366' },
                              referral_converted: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' },
                              payout_processed: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', text: '#c084fc' },
                              weekly_leaderboard: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24' },
                            };
                            const cc = catColors[t.category] || catColors.activation;
                            return (
                              <button
                                key={t.id}
                                onClick={() => setBroadcastTemplate(t.id)}
                                className="text-left transition-all"
                                style={{
                                  padding: '14px 16px 12px',
                                  borderRadius: 14,
                                  background: active ? cc.bg : 'var(--admin-surface-soft)',
                                  border: `1.5px solid ${active ? cc.border : 'var(--admin-border-soft)'}`,
                                  outline: 'none',
                                  boxShadow: active ? `0 0 0 3px ${cc.bg}` : 'none',
                                }}
                              >
                                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: active ? cc.text : 'var(--admin-text-primary)', lineHeight: 1.3 }}>{t.name}</p>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: 10, fontWeight: 700,
                                  padding: '3px 10px', borderRadius: 20,
                                  background: cc.bg, color: cc.text,
                                  border: `1px solid ${cc.border}`,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                }}>
                                  {t.category.replace(/_/g, ' ')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Message Preview */}
                      <div style={{ marginBottom: 28 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--admin-text-muted)', letterSpacing: '0.10em' }}>Message Preview</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--admin-border-soft)' }} />
                        </div>
                        <div style={{ borderRadius: 16, padding: 16, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.20)' }}>
                          {/* Chat contact row */}
                          <div className="flex items-center gap-3" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(37,211,102,0.15)' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25d366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>TP</div>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#25d366', lineHeight: 1.2, marginBottom: 2 }}>Taxplan Bot</p>
                              <p style={{ fontSize: 10, color: 'rgba(37,211,102,0.6)' }}>WhatsApp Business ✓</p>
                            </div>
                          </div>
                          {/* Bubble */}
                          <div style={{ borderRadius: '4px 14px 14px 14px', padding: '12px 14px', background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.18)', display: 'inline-block', maxWidth: '100%' }}>
                            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--admin-text-primary)', marginBottom: 6 }}>{getBroadcastPreview(broadcastTemplate)}</p>
                            <p style={{ fontSize: 10, color: 'rgba(37,211,102,0.55)', textAlign: 'right' }}>12:00 PM ✓✓</p>
                          </div>
                        </div>
                      </div>

                      {/* Warning notice */}
                      <div className="flex items-start gap-3" style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <AlertCircle size={14} style={{ color: '#fbbf24' }} />
                        </div>
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: '#fbbf24' }}>
                          Template must be approved by WhatsApp BSP before sending.{' '}
                          <span style={{ color: 'var(--admin-text-muted)' }}>Simulates dispatch to</span>{' '}
                          <strong style={{ color: '#fbbf24' }}>{selectedRecipients.size} active ambassador{selectedRecipients.size !== 1 ? 's' : ''}</strong>.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Broadcast History */}
                  {broadcastLists.length > 0 && (
                    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--admin-text-strong)' }}>Broadcast History</h3>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--admin-surface-soft)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border-soft)' }}>
                          {broadcastLists.length} sent
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {broadcastLists.slice().reverse().map(b => (
                          <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)' }}>
                            {/* status dot */}
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: b.sentAt ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}>
                              {b.sentAt
                                ? <CheckCircle2 size={15} style={{ color: '#34d399' }} />
                                : <Clock size={15} style={{ color: '#fbbf24' }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text-strong)' }}>{b.templateName}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                                {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.20)' }}>
                                {b.sentCount} recipients
                              </span>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={b.sentAt ? { background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.20)' } : { background: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.20)' }}>
                                {b.sentAt ? 'Sent' : 'Queued'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Recipients Card */}
                  <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                    {/* Header */}
                    <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--admin-border-soft)', background: 'rgba(168,85,247,0.04)' }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                            <Users size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 2 }}>Recipients</h2>
                            <p style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>Active ambassadors only</p>
                          </div>
                        </div>
                        {/* Count pill — fixed width so it never gets clipped */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 12px', borderRadius: 20, flexShrink: 0, marginLeft: 8, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#c084fc', fontVariantNumeric: 'tabular-nums' }}>{selectedRecipients.size}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(192,132,252,0.60)' }}>/ {recipients.length}</span>
                        </div>
                      </div>

                      {/* Select all / none + progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => setSelectedRecipients(new Set(recipients.map(r => r.ambassadorId)))}
                          style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.10)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.22)', cursor: 'pointer' }}
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedRecipients(new Set())}
                          style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'var(--admin-surface-soft)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border-soft)', cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                        {/* Progress bar */}
                        <div style={{ flex: 1, height: 5, borderRadius: 99, overflow: 'hidden', background: 'var(--admin-border-soft)', marginLeft: 4 }}>
                          <div
                            style={{ height: '100%', borderRadius: 99, transition: 'width 0.3s ease', width: `${recipients.length ? (selectedRecipients.size / recipients.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#a855f7,#c084fc)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* List */}
                    <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                      {recipients.map(r => {
                        const checked = selectedRecipients.has(r.ambassadorId);
                        return (
                          <label
                            key={r.ambassadorId}
                            className="flex items-center cursor-pointer transition-all"
                            style={{
                              gap: 12,
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: checked ? 'rgba(168,85,247,0.08)' : 'var(--admin-surface-soft)',
                              border: `1.5px solid ${checked ? 'rgba(168,85,247,0.28)' : 'var(--admin-border-soft)'}`,
                            }}
                          >
                            {/* Custom checkbox */}
                            <div
                              className="flex items-center justify-center shrink-0 transition-all"
                              style={{
                                width: 17, height: 17, borderRadius: 5,
                                background: checked ? '#a855f7' : 'transparent',
                                border: `2px solid ${checked ? '#a855f7' : 'var(--admin-border-mid)'}`,
                              }}
                            >
                              {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                            </div>
                            <input type="checkbox" checked={checked} onChange={() => toggleRecipient(r.ambassadorId)} className="sr-only" />

                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--admin-text-primary)' }}>{r.name}</p>
                              <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.phone} · {r.college}</p>
                            </div>
                            {tierBadge(r.tier)}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                    <button
                      onClick={handleSendBroadcast}
                      disabled={selectedRecipients.size === 0}
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '13px 16px',
                        borderRadius: 14,
                        fontSize: 13, fontWeight: 700,
                        cursor: selectedRecipients.size === 0 ? 'not-allowed' : 'pointer',
                        border: 'none',
                        transition: 'all 0.2s',
                        ...(broadcastSent
                          ? { background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 8px 24px rgba(5,150,105,0.35)' }
                          : selectedRecipients.size === 0
                            ? { background: 'var(--admin-tab-idle)', color: 'var(--admin-text-muted)' }
                            : { background: 'linear-gradient(135deg,#22c55e,#25d366)', color: '#fff', boxShadow: '0 8px 24px rgba(37,211,102,0.32)' })
                      }}
                    >
                      {broadcastSent ? (
                        <><CheckCircle2 size={16} /><span>Broadcast Queued!</span></>
                      ) : (
                        <><Send size={15} /><span>Send to {selectedRecipients.size > 0 ? `${selectedRecipients.size} ${selectedRecipients.size === 1 ? 'Person' : 'People'}` : 'No One'}</span></>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const sel = recipients.filter(r => selectedRecipients.has(r.ambassadorId));
                        exportCSV(['Name', 'Phone', 'College', 'Tier'], sel.map(r => [r.name, r.phone, r.college, `Tier ${r.tier}`]), `whatsapp-broadcast-${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      title="Export recipient list as CSV"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 46, flexShrink: 0,
                        borderRadius: 14,
                        background: 'var(--admin-surface-strong)',
                        color: 'var(--admin-text-secondary)',
                        border: '1px solid var(--admin-border-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={15} />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB: Data Export
            ══════════════════════════════════════════════════ */}
            {activeTab === 'export' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Leaderboard */}
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--admin-border-soft)', background: 'rgba(168,85,247,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                        <Trophy size={20} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 3 }}>Leaderboard Export</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>{leaderboard.length} ambassadors</span>
                          <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>ranked by referrals</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px 20px' }}>
                    <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                      Exports: Rank, Ambassador ID, Name, College, Referrals, Revenue, Commission
                    </p>
                    <button
                      onClick={() => {
                        setExporting(true);
                        exportCSV(
                          ['Rank', 'Ambassador ID', 'Name', 'College', 'Referrals', 'Revenue (₹)', 'Commission (₹)'],
                          leaderboard.map(e => [e.rank, e.ambassadorId, e.name, e.college, e.referrals, e.revenue, e.commission]),
                          `taxplan-leaderboard-${new Date().toISOString().split('T')[0]}.csv`
                        );
                        setTimeout(() => setExporting(false), 800);
                      }}
                      disabled={exporting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', boxShadow: '0 6px 18px rgba(124,58,237,0.35)', opacity: exporting ? 0.6 : 1 }}
                    >
                      {exporting ? <><Loader2 size={15} className="animate-spin" /><span>Exporting…</span></> : <><Download size={15} /><span>Export Leaderboard CSV</span></>}
                    </button>
                  </div>
                </div>

                {/* Ambassador DB */}
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--admin-border-soft)', background: 'rgba(16,185,129,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 3 }}>Ambassador Database</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>{ambassadors.length} total</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>{adminStats.active} active</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>{adminStats.pendingKyc} pending KYC</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px 20px' }}>
                    <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                      Columns: ID, Name, Email, Phone, College, City, PAN, Bank, IFSC, Tier, Referrals, Commission, KYC, Training, Agreement, Active, Joined, Coupon
                    </p>
                    <button
                      onClick={() => {
                        setExporting(true);
                        exportCSV(
                          ['ID', 'Name', 'Email', 'Phone', 'College', 'City', 'PAN', 'Bank Account', 'IFSC', 'Tier', 'Referrals', 'Commission (₹)', 'KYC Status', 'Training', 'Agreement', 'Active', 'Joined', 'Coupon Code'],
                          ambassadors.map(a => [a.id, a.name, a.email, a.phone, a.college, a.city, a.panNumber || '', a.bankAccount || '', a.ifscCode || '', a.tier, a.totalReferrals, a.totalCommission, a.kycStatus, a.trainingCompleted ? 'Yes' : 'No', a.agreementSigned ? 'Yes' : 'No', a.isActive ? 'Yes' : 'No', a.joinedAt, a.couponCode]),
                          `taxplan-ambassadors-${new Date().toISOString().split('T')[0]}.csv`
                        );
                        setTimeout(() => setExporting(false), 500);
                      }}
                      disabled={exporting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 6px 18px rgba(5,150,105,0.30)', opacity: exporting ? 0.6 : 1 }}
                    >
                      {exporting ? <><Loader2 size={15} className="animate-spin" /><span>Exporting…</span></> : <><FileSpreadsheet size={15} /><span>Export Ambassador CSV</span></>}
                    </button>
                  </div>
                </div>

                {/* TDS Report */}
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
                  <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--admin-border-soft)', background: 'rgba(245,158,11,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 3 }}>TDS Report (for CA)</h2>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>Chartered Accountant</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px 20px' }}>
                    <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                      TDS deduction details — includes gross commission, TDS rate (2% with PAN / 20% without), net payout per ambassador.
                    </p>
                    <button
                      onClick={() => {
                        const rows = ambassadors.filter(a => a.totalCommission > 0).map(a => {
                          const tds = Math.round(a.totalCommission * (a.panNumber ? 0.02 : 0.20));
                          return [a.id, a.name, a.panNumber || '', 'YTD', String(a.totalCommission), a.panNumber ? '2%' : '20%', String(tds), String(a.totalCommission - tds), 'calculated'];
                        });
                        exportCSV(['Ambassador ID', 'Name', 'PAN', 'Month', 'Gross Commission', 'TDS Rate', 'TDS Deducted', 'Net Payout', 'Status'], rows, `taxplan-tds-${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', boxShadow: '0 6px 18px rgba(217,119,6,0.30)' }}
                    >
                      <Download size={15} /><span>Export TDS Report CSV</span>
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--admin-border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                        <Copy size={18} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 3 }}>Quick Stats Snapshot</h2>
                        <p style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Copy a summary to clipboard</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px 20px' }}>
                    <div style={{ borderRadius: 12, padding: '14px 16px', background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-strong)', fontFamily: 'monospace' }}>Taxplan Ambassador Summary</p>
                      {[
                        { label: 'Total', value: adminStats.total }, { label: 'Active', value: adminStats.active }, { label: 'Inactive', value: adminStats.inactive }
                      ].map(s => null) /* inline below */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.20)' }}>Active: {adminStats.active}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }}>Inactive: {adminStats.inactive}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.20)' }}>Pending KYC: {adminStats.pendingKyc}</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--admin-border-soft)' }} />
                      <p style={{ fontSize: 12, color: 'var(--admin-text-secondary)', fontFamily: 'monospace' }}>Total Referrals: <strong style={{ color: 'var(--admin-text-primary)' }}>{adminStats.totalReferrals}</strong></p>
                      <p style={{ fontSize: 12, color: 'var(--admin-text-secondary)', fontFamily: 'monospace' }}>Total Payouts: <strong style={{ color: 'var(--admin-text-primary)' }}>₹{adminStats.totalPayouts.toLocaleString()}</strong></p>
                    </div>
                    <button
                      onClick={async () => {
                        const text = `Taxplan Ambassador Summary\nTotal: ${adminStats.total} | Active: ${adminStats.active} | Inactive: ${adminStats.inactive}\nReferrals: ${adminStats.totalReferrals}\nPayouts: ₹${adminStats.totalPayouts.toLocaleString()}\nPending KYC: ${adminStats.pendingKyc}`;
                        await navigator.clipboard.writeText(text);
                        setCopiedMessage(true);
                        setTimeout(() => setCopiedMessage(false), 2000);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--admin-surface-strong)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border-soft)' }}
                    >
                      {copiedMessage ? <><Check size={15} style={{ color: '#34d399' }} /><span style={{ color: '#34d399' }}>Copied!</span></> : <><Copy size={15} /><span>Copy Summary</span></>}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.60)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => setShowConfirm(null)}
        >
          {/* Card — stop click propagation so clicking the card doesn't close */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 380,
              borderRadius: 24,
              padding: '24px 24px 20px',
              background: isLight ? '#ffffff' : '#111b2e',
              border: `1px solid ${isLight ? 'rgba(203,213,225,0.8)' : 'rgba(51,65,85,0.7)'}`,
              boxShadow: '0 32px 80px rgba(0,0,0,0.50)',
              ...themeVars,
            }}
          >
            {/* Icon + title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(showConfirm.action === 'activate'
                    ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                    : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }),
                }}
              >
                {showConfirm.action === 'activate' ? <UserCheck size={22} /> : <UserX size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isLight ? '#0f172a' : '#f1f5f9' }}>
                  Confirm {showConfirm.action === 'activate' ? 'Activation' : 'Deactivation'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                  {showConfirm.name}
                </p>
              </div>
            </div>

            {/* Body text */}
            <p style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.65, color: isLight ? '#475569' : '#94a3b8' }}>
              {showConfirm.action === 'deactivate'
                ? 'They will no longer be able to generate referrals or earn commissions.'
                : 'They will regain access to the ambassador portal and can start referring.'}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(null)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${isLight ? 'rgba(203,213,225,0.8)' : 'rgba(51,65,85,0.7)'}`,
                  background: isLight ? 'rgba(241,245,249,0.9)' : 'rgba(30,41,59,0.8)',
                  color: isLight ? '#334155' : '#94a3b8',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  ...(showConfirm.action === 'activate'
                    ? { background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 6px 20px rgba(5,150,105,0.40)' }
                    : { background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', boxShadow: '0 6px 20px rgba(220,38,38,0.40)' }),
                }}
              >
                {showConfirm.action === 'activate' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── KYC Review Modal ── */}
      {kycDrawerId && kycAmbassador && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
            boxSizing: 'border-box',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 0,
            }}
            onClick={() => setKycDrawerId(null)}
          />
          {/* Panel — height is fully bounded so scrolling stays inside */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 560,
              height: isMobile ? 'calc(100dvh - 24px)' : 'min(85vh, 860px)',
              maxHeight: isMobile ? 'calc(100dvh - 24px)' : '85vh',
              background: isLight ? '#f8fafc' : '#0d1526',
              borderRadius: 18,
              border: `1px solid ${isLight ? 'rgba(203,213,225,0.8)' : 'rgba(51,65,85,0.7)'}`,
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              ...themeVars,
            }}
          >
            {/* ── Drawer Header ── */}
            <div
              className="shrink-0"
              style={{
                background: isLight ? '#ffffff' : '#111b2e',
                borderBottom: `1px solid ${isLight ? 'rgba(203,213,225,0.6)' : 'rgba(51,65,85,0.6)'}`,
              }}
            >
              {/* Top row: avatar + name + close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px 14px' }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800,
                  background: kycAmbassador.isActive ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'var(--admin-tab-idle)',
                  color: kycAmbassador.isActive ? '#fff' : 'var(--admin-text-secondary)',
                  boxShadow: kycAmbassador.isActive ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                }}>
                  {kycAmbassador.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </div>
                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--admin-text-strong)', margin: 0, letterSpacing: '-0.01em' }}>
                    {kycAmbassador.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {kycAmbassador.email} · {kycAmbassador.phone}
                  </p>
                </div>
                {/* Close */}
                <button
                  onClick={() => setKycDrawerId(null)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--admin-tab-idle)', color: 'var(--admin-text-secondary)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 4, padding: '0 20px 14px' }}>
                {[
                  { id: 'kyc', label: 'KYC & Activation' },
                  { id: 'quiz', label: 'Quiz Results' },
                  { id: 'reports', label: 'Field Reports' },
                  { id: 'calls', label: 'Call Tracking' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setKycDrawerTab(t.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                      ...(kycDrawerTab === t.id
                        ? { background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }
                        : { background: 'transparent', color: 'var(--admin-text-muted)', border: '1px solid transparent' }),
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer body — a plain (non-flex) scroll container, so its
                content sizes naturally instead of the browser shrinking
                flex children to fit; that shrinking is what was clipping
                sections instead of letting this panel scroll. */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 20, minHeight: 0 }}>

              {/* ── KYC tab ── */}
              {kycDrawerTab === 'kyc' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* ── Status strip ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge color={kycAmbassador.isActive ? 'green' : 'amber'}>
                      {kycAmbassador.isActive ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {kycAmbassador.isActive ? 'Active' : 'Pending Activation'}
                    </Badge>
                    <Badge color={kycAmbassador.agreementSigned ? 'green' : 'red'}>
                      <FileCheck size={11} /> Agreement: {kycAmbassador.agreementSigned ? 'Signed' : 'Not Signed'}
                    </Badge>
                    <Badge color={kycAmbassador.trainingCompleted ? 'green' : 'amber'}>
                      <GraduationCap size={11} /> Training: {kycAmbassador.trainingCompleted ? 'Done' : 'Pending'}
                    </Badge>
                    {kycAmbassador.kycStatus && (
                      <Badge color={kycAmbassador.kycStatus === 'verified' ? 'green' : kycAmbassador.kycStatus === 'rejected' ? 'red' : 'amber'}>
                        <Shield size={11} /> KYC: {kycAmbassador.kycStatus}
                      </Badge>
                    )}
                    {kycAmbassador.interestStatus && (
                      <Badge color={kycAmbassador.interestStatus === 'interested' ? 'green' : 'red'}>
                        {kycAmbassador.interestStatus === 'interested' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {kycAmbassador.interestStatus === 'interested' ? 'Interested' : 'Not Interested'}
                      </Badge>
                    )}
                  </div>

                  {/* ── Personal Details ── */}
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isLight ? 'rgba(203,213,225,0.7)' : 'rgba(51,65,85,0.6)'}` }}>
                    <div style={{ padding: '10px 16px', background: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(15,23,42,0.6)', borderBottom: `1px solid ${isLight ? 'rgba(203,213,225,0.5)' : 'rgba(51,65,85,0.5)'}` }}>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--admin-text-muted)', margin: 0 }}>Personal Details</p>
                    </div>
                    <div style={{ background: isLight ? '#ffffff' : '#111b2e' }}>
                      {[
                        ['Full Name', kycAmbassador.name],
                        ['Email', kycAmbassador.email || '—'],
                        ['Phone', kycAmbassador.phone],
                        ['City', kycAmbassador.city],
                        ['College', kycAmbassador.college],
                        ['Course', kycAmbassador.course || '—'],
                        ['Year of Study', kycAmbassador.yearOfStudy || '—'],
                      ].map(([k, v], idx, arr) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: idx < arr.length - 1 ? `1px solid ${isLight ? 'rgba(226,232,240,0.7)' : 'rgba(51,65,85,0.4)'}` : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-muted)' }}>{k}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── KYC & Bank ── */}
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isLight ? 'rgba(203,213,225,0.7)' : 'rgba(51,65,85,0.6)'}` }}>
                    <div style={{ padding: '10px 16px', background: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(15,23,42,0.6)', borderBottom: `1px solid ${isLight ? 'rgba(203,213,225,0.5)' : 'rgba(51,65,85,0.5)'}` }}>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--admin-text-muted)', margin: 0 }}>KYC &amp; Bank Details</p>
                    </div>
                    <div style={{ background: isLight ? '#ffffff' : '#111b2e' }}>
                      {[
                        ['PAN Number', kycAmbassador.panNumber || '—'],
                        ['Bank Account', kycAmbassador.bankAccount || '—'],
                        ['IFSC Code', kycAmbassador.ifscCode || '—'],
                      ].map(([k, v], idx, arr) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: idx < arr.length - 1 ? `1px solid ${isLight ? 'rgba(226,232,240,0.7)' : 'rgba(51,65,85,0.4)'}` : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-muted)' }}>{k}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: v === '—' ? 'var(--admin-text-muted)' : 'var(--admin-text-strong)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Activation Checklist ── */}
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isLight ? 'rgba(203,213,225,0.7)' : 'rgba(51,65,85,0.6)'}` }}>
                    <div style={{ padding: '10px 16px', background: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(15,23,42,0.6)', borderBottom: `1px solid ${isLight ? 'rgba(203,213,225,0.5)' : 'rgba(51,65,85,0.5)'}` }}>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--admin-text-muted)', margin: 0 }}>Activation Checklist</p>
                    </div>
                    <div style={{ background: isLight ? '#ffffff' : '#111b2e' }}>
                      {[
                        { label: 'PAN + bank details provided', done: !!(kycAmbassador.panNumber && kycAmbassador.bankAccount) },
                        { label: 'Ambassador signed agreement', done: kycAmbassador.agreementSigned },
                        { label: '₹1 test transfer completed', done: kycAmbassador.testTransferDone },
                      ].map((item, idx, arr) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < arr.length - 1 ? `1px solid ${isLight ? 'rgba(226,232,240,0.7)' : 'rgba(51,65,85,0.4)'}` : 'none' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: item.done ? 'rgba(16,185,129,0.15)' : 'transparent',
                            border: item.done ? 'none' : '2px solid var(--admin-border-mid)',
                          }}>
                            {item.done && <CheckCircle2 size={14} style={{ color: '#34d399' }} />}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: item.done ? 600 : 400, color: item.done ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)' }}>
                            {item.label}
                          </span>
                          {item.done && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#34d399' }}>Done</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Feedback ── */}
                  {kycActionError && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {kycActionError}
                    </div>
                  )}
                  {kycActionSuccess && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: 13 }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {kycActionSuccess}
                    </div>
                  )}

                  {/* ── Activate fallback ── */}
                  {!kycAmbassador.isActive && (
                    <div style={{ borderRadius: 14, background: isLight ? '#ffffff' : '#111b2e', border: '1px solid rgba(16,185,129,0.3)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', color: '#34d399', flexShrink: 0 }}>
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Activate — Fallback Override</p>
                          <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '2px 0 0' }}>Use only if automatic activation didn't trigger.</p>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleKycActivate(kycAmbassador.id)}
                          disabled={kycActionLoading === 'activate' || !kycAmbassador.agreementSigned}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: kycActionLoading === 'activate' || !kycAmbassador.agreementSigned ? 'not-allowed' : 'pointer', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, opacity: !kycAmbassador.agreementSigned ? 0.5 : 1, boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
                        >
                          {kycActionLoading === 'activate' ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                          Activate Ambassador
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Active status banner ── */}
                  {kycAmbassador.isActive && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      padding: '12px 16px', borderRadius: 12, flexWrap: 'wrap',
                      ...(kycAmbassador.trainingCompleted
                        ? { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                        : { background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }),
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {kycAmbassador.trainingCompleted ? '✓ Active & coupon live' : '⚠ Active — coupon inactive until training done'}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {kycAmbassador.couponCode || '—'}
                      </span>
                    </div>
                  )}

                  {/* ── Coupon control ── */}
                  {kycAmbassador.isActive && kycAmbassador.trainingCompleted && (
                    <div style={{ borderRadius: 14, background: isLight ? '#ffffff' : '#111b2e', border: '1px solid rgba(168,85,247,0.25)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.15)', color: '#c084fc', flexShrink: 0 }}>
                          <Tag size={18} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Coupon Control</p>
                          <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '2px 0 0' }}>Manually pause or resume referral tracking.</p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <Badge color={kycAmbassador.couponActive ? 'green' : 'red'}>
                            {kycAmbassador.couponActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {kycAmbassador.couponActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleToggleCoupon(kycAmbassador.id, !kycAmbassador.couponActive)}
                          disabled={kycActionLoading === 'coupon'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: kycActionLoading === 'coupon' ? 0.5 : 1, ...(kycAmbassador.couponActive ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' } : { background: '#059669', color: '#fff', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }) }}
                        >
                          {kycActionLoading === 'coupon' ? <Loader2 size={14} className="animate-spin" /> : kycAmbassador.couponActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          {kycAmbassador.couponActive ? 'Pause Coupon' : 'Resume Coupon'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Certificate PDF ── */}
                  {kycAmbassador.isActive && (
                    <div style={{ borderRadius: 14, background: isLight ? '#ffffff' : '#111b2e', border: '1px solid rgba(245,158,11,0.25)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', flexShrink: 0 }}>
                          <Award size={18} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Certificate PDF</p>
                          <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '2px 0 0' }}>Regenerate and upload Certificate / LOR to S3.</p>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <button
                          onClick={async () => {
                            setKycActionLoading('cert'); setKycActionError(null); setKycActionSuccess(null);
                            try {
                              const res = await pmRegenerateCertificate(parseInt(kycAmbassador.id, 10));
                              setKycActionSuccess(`PDF regenerated (${res.cert_type}).`);
                            } catch { setKycActionError('PDF generation failed.'); }
                            finally { setKycActionLoading(null); }
                          }}
                          disabled={kycActionLoading === 'cert'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 700, opacity: kycActionLoading === 'cert' ? 0.5 : 1, boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }}
                        >
                          {kycActionLoading === 'cert' ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                          Regenerate PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Quiz tab ── */}
              {kycDrawerTab === 'quiz' && (
                <div className="space-y-4">
                  {pmProgressLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      <Loader2 size={18} className="animate-spin" /> Loading module progress…
                    </div>
                  ) : pmModuleProgress ? (
                    <>
                      {/* Progress bar */}
                      <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)' }}>
                        <div className="flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                          <span>{pmModuleProgress.completed_modules} / {pmModuleProgress.total_modules} modules</span>
                          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{Math.round((pmModuleProgress.completed_modules / (pmModuleProgress.total_modules || 1)) * 100)}%</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border-mid)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(pmModuleProgress.completed_modules / (pmModuleProgress.total_modules || 1)) * 100}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold pt-0.5">
                          {[
                            { s: 'completed', label: '✓ Done', color: '#34d399' },
                            { s: 'quiz_pending', label: '📝 Quiz pending', color: '#60a5fa' },
                            { s: 'video_pending', label: '📺 Video pending', color: '#fbbf24' },
                            { s: 'locked', label: '🔒 Locked', color: 'var(--admin-text-muted)' },
                          ].map(({ s, label, color }) => {
                            const count = pmModuleProgress.modules.filter(m => m.status === s).length;
                            return count > 0 ? <span key={s} style={{ color }}>{label}: {count}</span> : null;
                          })}
                        </div>
                      </div>

                      {/* Module list */}
                      <div className="space-y-2">
                        {pmModuleProgress.modules.map(m => {
                          const quizData = pmQuizAttempts.find(q => q.module_id === m.module_id);
                          const isExp = expandedModuleId === m.module_id;
                          const cfg = {
                            completed: { dot: '#34d399', chipBg: 'rgba(16,185,129,0.15)', chipColor: '#34d399', label: 'Completed' },
                            quiz_pending: { dot: '#60a5fa', chipBg: 'rgba(59,130,246,0.15)', chipColor: '#60a5fa', label: 'Quiz pending' },
                            video_pending: { dot: '#fbbf24', chipBg: 'rgba(245,158,11,0.15)', chipColor: '#fbbf24', label: 'Video pending' },
                            locked: { dot: 'var(--admin-border-mid)', chipBg: 'var(--admin-tab-idle)', chipColor: 'var(--admin-text-muted)', label: 'Locked' },
                          }[m.status] || { dot: 'var(--admin-border-mid)', chipBg: 'var(--admin-tab-idle)', chipColor: 'var(--admin-text-muted)', label: 'Locked' };

                          return (
                            <div key={m.module_id} className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)' }}>
                              <button
                                onClick={() => m.total_attempts > 0 && setExpandedModuleId(isExp ? null : m.module_id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${m.total_attempts > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{m.module_order}</span>
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                                <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--admin-text-primary)' }}>{m.module_title}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.chipBg, color: cfg.chipColor }}>{cfg.label}</span>
                                  {m.total_attempts > 0 && <span className="text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>{m.best_score}% best</span>}
                                  {m.total_attempts > 0 && (isExp ? <ChevronUp size={13} style={{ color: 'var(--admin-text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--admin-text-muted)' }} />)}
                                </div>
                              </button>
                              {isExp && quizData && (
                                <div style={{ background: 'var(--admin-surface-soft)', borderTop: '1px solid var(--admin-border-soft)' }}>
                                  {quizData.attempts.map(att => (
                                    <div key={att.attempt_number} className="px-4 py-2.5 flex items-center justify-between text-sm" style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                      <div>
                                        <p className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Attempt #{att.attempt_number}</p>
                                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{new Date(att.attempted_at).toLocaleString()}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold" style={{ color: att.passed ? '#34d399' : '#f87171' }}>{att.score}% {att.passed ? '✓' : '✗'}</p>
                                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{att.correct_count}/{att.total_questions} correct</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-sm py-16" style={{ color: 'var(--admin-text-muted)' }}>Could not load module progress.</p>
                  )}
                </div>
              )}

              {/* ── Field Reports tab ── */}
              {kycDrawerTab === 'reports' && (
                <div className="space-y-4">
                  {pmReportsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      <Loader2 size={18} className="animate-spin" /> Loading field reports…
                    </div>
                  ) : !pmDailyReports || pmDailyReports.reports.length === 0 ? (
                    <p className="text-center text-sm py-16" style={{ color: 'var(--admin-text-muted)' }}>No field reports submitted yet.</p>
                  ) : (
                    <>
                      {/* Summary grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['Reports', pmDailyReports.totals.report_days],
                          ['Approached', pmDailyReports.totals.total_people_approached],
                          ['Leads', pmDailyReports.totals.total_leads_generated],
                          ['Hot Leads', pmDailyReports.totals.total_hot_leads],
                          ['Booked', pmDailyReports.totals.total_consultations_booked],
                          ['Closed', pmDailyReports.totals.total_sales_closed],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-xl p-3 text-center" style={{ background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)' }}>
                            <p className="text-lg font-extrabold" style={{ color: 'var(--admin-text-strong)' }}>{v}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{k}</p>
                          </div>
                        ))}
                      </div>

                      {/* Report list */}
                      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-soft)' }}>
                        {pmDailyReports.reports.map(r => (
                          <div key={r.id} className="px-4 py-3.5 transition-colors" style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-bold" style={{ color: 'var(--admin-text-strong)' }}>{r.date}</p>
                              <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{r.area_visited}</span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                              {r.people_approached} approached · {r.leads_generated} leads · {r.hot_leads} hot · {r.sales_closed} closed
                            </p>
                            {r.services_discussed && (
                              <span className="inline-block text-[11px] mt-1.5 px-2 py-0.5 rounded-lg" style={{ background: 'var(--admin-tab-idle)', color: 'var(--admin-text-muted)' }}>
                                Services: {r.services_discussed}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Call Tracking tab ── */}
              {kycDrawerTab === 'calls' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* ── Quick-dial + stats bar ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '12px 16px', borderRadius: 14,
                    background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
                  }}>
                    <a
                      href={`tel:${kycAmbassador.phone || ''}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: 10, textDecoration: 'none',
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.35)',
                        fontSize: 13, fontWeight: 700,
                      }}
                    >
                      <Phone size={14} />
                      {kycAmbassador.phone || '—'}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 20,
                        background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
                      }}>
                        <Phone size={11} style={{ color: '#c084fc' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>
                          {pmCallLogs.length} call{pmCallLogs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── New call entry card ── */}
                  <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.22)' }}>

                    {/* Card header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px',
                      background: 'rgba(124,58,237,0.08)',
                      borderBottom: '1px solid rgba(124,58,237,0.15)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(124,58,237,0.18)', color: '#a78bfa',
                      }}>
                        <Phone size={14} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Log New Call</p>
                        <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '1px 0 0' }}>Record call outcome and follow-up</p>
                      </div>
                    </div>

                    {/* Form body */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--admin-surface-soft)' }}>

                      {/* Row 1: Caller + Status */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                            Caller
                          </label>
                          <select
                            value={callTrackingDraft.caller_id}
                            onChange={(e) => setCallTrackingDraft(prev => ({ ...prev, caller_id: e.target.value }))}
                            style={{
                              fontSize: 13, borderRadius: 10, padding: '9px 12px',
                              background: 'var(--admin-surface-strong)',
                              border: '1px solid var(--admin-border-mid)',
                              color: 'var(--admin-text-strong)',
                              outline: 'none', width: '100%',
                            }}
                          >
                            <option value="">Select Caller</option>
                            {pmCallerOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                            Call Status
                          </label>
                          <select
                            value={callTrackingDraft.call_status}
                            onChange={(e) => setCallTrackingDraft(prev => ({ ...prev, call_status: e.target.value }))}
                            style={{
                              fontSize: 13, borderRadius: 10, padding: '9px 12px',
                              background: 'var(--admin-surface-strong)',
                              border: `1px solid ${callTrackingDraft.call_status ? 'rgba(124,58,237,0.4)' : 'var(--admin-border-mid)'}`,
                              color: callTrackingDraft.call_status ? '#a78bfa' : 'var(--admin-text-muted)',
                              outline: 'none', width: '100%', fontWeight: callTrackingDraft.call_status ? 700 : 400,
                            }}
                          >
                            {CALL_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Follow-up datetime */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                          Next Follow-up
                        </label>
                        <input
                          type="datetime-local"
                          value={callTrackingDraft.next_follow_up}
                          onChange={(e) => setCallTrackingDraft(prev => ({ ...prev, next_follow_up: e.target.value }))}
                          style={{
                            fontSize: 13, borderRadius: 10, padding: '9px 12px',
                            background: 'var(--admin-surface-strong)',
                            border: `1px solid ${callTrackingDraft.next_follow_up ? 'rgba(59,130,246,0.4)' : 'var(--admin-border-mid)'}`,
                            color: 'var(--admin-text-strong)',
                            outline: 'none', width: '100%', boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Row 3: Comments */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                          Comments
                        </label>
                        <textarea
                          placeholder="What was discussed on this call…"
                          value={callTrackingDraft.comments}
                          onChange={(e) => setCallTrackingDraft(prev => ({ ...prev, comments: e.target.value }))}
                          rows={3}
                          style={{
                            fontSize: 13, borderRadius: 10, padding: '10px 12px',
                            background: 'var(--admin-surface-strong)',
                            border: '1px solid var(--admin-border-mid)',
                            color: 'var(--admin-text-strong)',
                            outline: 'none', width: '100%', boxSizing: 'border-box',
                            resize: 'none', lineHeight: 1.6,
                          }}
                        />
                      </div>

                      {/* Row 4: Issue Facing */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                          Issue Facing <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span>
                        </label>
                        <textarea
                          placeholder="Describe any issue the ambassador is facing…"
                          value={callTrackingDraft.issue_facing}
                          onChange={(e) => setCallTrackingDraft(prev => ({ ...prev, issue_facing: e.target.value }))}
                          rows={2}
                          style={{
                            fontSize: 13, borderRadius: 10, padding: '10px 12px',
                            background: 'var(--admin-surface-strong)',
                            border: `1px solid ${callTrackingDraft.issue_facing ? 'rgba(239,68,68,0.35)' : 'var(--admin-border-mid)'}`,
                            color: 'var(--admin-text-strong)',
                            outline: 'none', width: '100%', boxSizing: 'border-box',
                            resize: 'none', lineHeight: 1.6,
                          }}
                        />
                      </div>

                      {/* Row 5: Lead interest */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>
                          Lead Interest
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { value: 'interested', label: 'Interested', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
                            { value: 'not_interested', label: 'Not Interested', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
                          ].map(opt => {
                            const active = callTrackingDraft.interest_status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCallTrackingDraft(prev => ({ ...prev, interest_status: active ? '' : opt.value }))}
                                style={{
                                  flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', transition: 'all 0.15s',
                                  background: active ? opt.bg : 'var(--admin-surface-strong)',
                                  color: active ? opt.color : 'var(--admin-text-muted)',
                                  border: `1px solid ${active ? opt.border : 'var(--admin-border-mid)'}`,
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Row 6: Save button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button
                          onClick={handleSaveAmbassadorCallTracking}
                          disabled={savingCallTracking || !callTrackingDraft.call_status}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '9px 20px', borderRadius: 10, border: 'none',
                            fontSize: 13, fontWeight: 700, cursor: savingCallTracking || !callTrackingDraft.call_status ? 'not-allowed' : 'pointer',
                            background: savingCallTracking || !callTrackingDraft.call_status ? 'var(--admin-tab-idle)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                            color: savingCallTracking || !callTrackingDraft.call_status ? 'var(--admin-text-muted)' : '#fff',
                            boxShadow: savingCallTracking || !callTrackingDraft.call_status ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
                            transition: 'all 0.2s', flexShrink: 0,
                          }}
                        >
                          {savingCallTracking ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Save Entry
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Call History ── */}
                  <div>
                    {/* Section label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--admin-text-muted)' }}>
                        Call History
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--admin-border-soft)' }} />
                      {pmCallLogs.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
                          {pmCallLogs.length} total
                        </span>
                      )}
                    </div>

                    {pmCallLogsLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                        <Loader2 size={18} className="animate-spin" /> Loading call history…
                      </div>
                    ) : pmCallLogs.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--admin-tab-idle)', color: 'var(--admin-text-muted)' }}>
                          <Phone size={20} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', margin: 0 }}>No calls logged yet</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pmCallLogs.map((log, idx) => {
                          const statusColors = {
                            completed: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
                            failed: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
                            'no-answer': { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
                            busy: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
                            ringing: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
                            initiated: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
                          };
                          const sc = statusColors[log.call_status] || { bg: 'rgba(148,163,184,0.12)', color: 'var(--admin-text-muted)', border: 'var(--admin-border-soft)' };

                          return (
                            <div
                              key={log.id}
                              style={{
                                borderRadius: 14, overflow: 'hidden',
                                background: 'var(--admin-surface-strong)',
                                border: '1px solid var(--admin-border-soft)',
                              }}
                            >
                              {/* Log header row */}
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px',
                                borderBottom: (log.comments || log.issue_facing || log.next_follow_up) ? '1px solid var(--admin-border-soft)' : 'none',
                              }}>
                                {/* Round badge */}
                                <div style={{
                                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'rgba(168,85,247,0.12)', color: '#c084fc',
                                  fontSize: 11, fontWeight: 800,
                                }}>
                                  {log.call_round || idx + 1}
                                </div>

                                {/* Caller + time */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {log.caller_name || 'Unassigned'}
                                  </p>
                                  <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '2px 0 0' }}>
                                    {log.called_at
                                      ? new Date(log.called_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                      : '—'}
                                  </p>
                                </div>

                                {/* Status + rejected badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                  {log.interest_status && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                      background: log.interest_status === 'interested' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                      color: log.interest_status === 'interested' ? '#34d399' : '#f87171',
                                      border: `1px solid ${log.interest_status === 'interested' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    }}>
                                      {log.interest_status_label || (log.interest_status === 'interested' ? 'Interested' : 'Not Interested')}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                                    background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                  }}>
                                    {log.call_status_label || log.call_status || 'Unknown'}
                                  </span>
                                </div>
                              </div>

                              {/* Log body — only if there's content */}
                              {(log.comments || log.issue_facing || log.next_follow_up) && (
                                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {log.comments && (
                                    <p style={{ fontSize: 12, color: 'var(--admin-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                      {log.comments}
                                    </p>
                                  )}
                                  {log.issue_facing && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                      <AlertCircle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                      <p style={{ fontSize: 12, color: '#f87171', margin: 0, lineHeight: 1.5 }}>{log.issue_facing}</p>
                                    </div>
                                  )}
                                  {log.next_follow_up && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', alignSelf: 'flex-start' }}>
                                      <Bell size={11} style={{ color: '#60a5fa' }} />
                                      <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>Follow-up: {log.next_follow_up}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
