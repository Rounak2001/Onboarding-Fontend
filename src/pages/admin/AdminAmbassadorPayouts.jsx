import { useState, useEffect } from 'react';
import { fetchPMPayoutPreview, pmProcessPayouts } from '../../services/ambassadorApi';
import {
  Wallet, Download, RefreshCw, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Loader2, IndianRupee, Users, Calendar,
} from 'lucide-react';

export default function AdminAmbassadorPayouts({ isLight, themeVars }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'all'
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadPreview = async () => {
    setLoading(true); setError(null);
    try {
      // pass empty string for all-time — API omits the month filter
      setPreview((await fetchPMPayoutPreview(viewMode === 'all' ? '' : month)) || null);
    } catch (e) { setError(e.message || 'Failed to load payout preview'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPreview(); }, [month, viewMode]);

  const handleProcess = async () => {
    if (!window.confirm(`Process payouts for ${viewMode === 'all' ? 'ALL TIME' : month}? This will create MonthlyCommission records.`)) return;
    setProcessing(true); setError(null); setSuccess(null);
    try {
      const d = await pmProcessPayouts(viewMode === 'all' ? '' : month);
      setSuccess(`${d.message || 'Processing successful'} — ${d.count || 0} ambassadors processed.`);
      await loadPreview();
    } catch (e) { setError(e.message || 'Processing failed'); }
    finally { setProcessing(false); }
  };

  const exportCSV = () => {
    if (!preview?.results) return;
    const headers = ['Ambassador', 'College', 'Month', 'Tier', 'Referrals', 'Gross (₹)', 'Stipend (₹)', 'TDS (₹)', 'Net Payout (₹)'];
    const rows = preview.results.map(r => [
      `"${r.ambassador_name}"`, `"${r.college}"`, r.month_key, r.tier,
      r.referral_count, r.gross_commission, r.stipend_amount, r.tds_amount, r.net_payout,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const label = viewMode === 'all' ? 'all-time' : month;
    Object.assign(document.createElement('a'), { href: url, download: `payouts-${label}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = viewMode === 'all'
    ? 'All Time'
    : (() => {
        const [y, m] = month.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      })();

  const cardStyle = {
    background: 'var(--admin-surface-strong)',
    border: '1px solid var(--admin-border-soft)',
    borderRadius: 18,
    boxShadow: isLight ? '0 4px 24px rgba(148,163,184,0.10)' : 'none',
  };

  return (
    <div style={{ ...themeVars, display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--admin-text-primary)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text-strong)', marginBottom: 4 }}>Payout Preview</h1>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>Review and process monthly ambassador payouts</p>
          </div>
          {/* Period picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Monthly / All Time toggle */}
            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface-soft)' }}>
              {[{ id: 'month', label: 'Monthly' }, { id: 'all', label: 'All Time' }].map(opt => {
                const active = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setViewMode(opt.id)}
                    style={{
                      padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                      background: active ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                      color: active ? '#fff' : 'var(--admin-text-muted)',
                      borderRadius: active ? 10 : 0,
                      margin: active ? 2 : 0,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Month input — only shown in monthly mode */}
            {viewMode === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)' }}>
                <Calendar size={14} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer' }}
                />
              </div>
            )}

            {/* All Time badge */}
            {viewMode === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7' }}>All Time</span>
              </div>
            )}

            <button
              onClick={loadPreview}
              disabled={loading}
              style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer', flexShrink: 0 }}
            >
              <RefreshCw size={14} style={{ color: 'var(--admin-text-muted)', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#f87171' }}>{error}</span>
          <button onClick={loadPreview} style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
          <CheckCircle2 size={16} style={{ color: '#34d399', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#34d399' }}>{success}</span>
        </div>
      )}

      {/* ── Summary cards ── */}
      {preview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {/* Ambassadors to pay */}
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Ambassadors to Pay</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>
                <Users size={16} />
              </div>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--admin-text-strong)', lineHeight: 1 }}>{preview.count}</p>
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>for {monthLabel}</p>
          </div>

          {/* Total net payout — accent card */}
          <div style={{ borderRadius: 18, padding: '20px 22px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 8px 28px rgba(124,58,237,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.60)' }}>Total Net Payout</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                <IndianRupee size={16} />
              </div>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>₹{Number(preview.total_net || 0).toLocaleString()}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>net after TDS</p>
          </div>

          {/* Month */}
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Pay Period</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                <Calendar size={16} />
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text-strong)', lineHeight: 1.2 }}>{monthLabel}</p>
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>processing window</p>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleProcess}
          disabled={processing || !preview || preview.count === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: (processing || !preview || preview.count === 0) ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
            boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
            opacity: (processing || !preview || preview.count === 0) ? 0.5 : 1,
          }}
        >
          {processing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <IndianRupee size={15} />}
          <span>{processing ? 'Processing…' : 'Process Payouts'}</span>
        </button>
        <button
          onClick={exportCSV}
          disabled={!preview || preview.count === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            cursor: (!preview || preview.count === 0) ? 'not-allowed' : 'pointer',
            background: 'var(--admin-surface-strong)', color: 'var(--admin-text-primary)',
            border: '1px solid var(--admin-border-soft)',
            opacity: (!preview || preview.count === 0) ? 0.45 : 1,
          }}
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.12)' }}>
            <Loader2 size={22} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text-muted)' }}>Loading payout preview…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && preview && (!preview.results || preview.results.length === 0) && (
        <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--admin-surface-soft)', margin: '0 auto 16px' }}>
            <Wallet size={24} style={{ color: 'var(--admin-text-muted)' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 6 }}>No payouts for {monthLabel}</p>
          <p style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No ambassadors with cleared referrals this month</p>
        </div>
      )}

      {/* ── Payout table ── */}
      {!loading && preview?.results?.length > 0 && (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>

          {/* Desktop column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 60px 1fr 1fr 1fr', gap: 12, padding: '11px 20px', background: 'var(--admin-surface-soft)', borderBottom: '1px solid var(--admin-border-soft)' }}>
            {['Ambassador', 'College', 'Tier', 'Refs', 'Gross', 'TDS', 'Net'].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-text-muted)', textAlign: i >= 4 ? 'right' : i === 2 || i === 3 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div>
            {preview.results.map((row, idx) => {
              const isExpanded = expandedId === row.ambassador_id;
              const initials = row.ambassador_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
              return (
                <div key={row.ambassador_id} style={{ borderBottom: idx < preview.results.length - 1 ? '1px solid var(--admin-border-soft)' : 'none' }}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : row.ambassador_id)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 60px 1fr 1fr 1fr', gap: 12, padding: '13px 20px', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'var(--admin-surface-soft)' : 'transparent', transition: 'background 0.15s' }}
                  >
                    {/* Ambassador */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>{initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ambassador_name}</span>
                    </div>
                    {/* College */}
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.college}</span>
                    {/* Tier */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>T{row.tier}</span>
                    </div>
                    {/* Refs */}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-strong)', textAlign: 'center' }}>{row.referral_count}</span>
                    {/* Gross */}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text-secondary)', textAlign: 'right' }}>₹{Number(row.gross_commission || 0).toLocaleString()}</span>
                    {/* TDS */}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#f87171', textAlign: 'right' }}>-₹{Number(row.tds_amount || 0).toLocaleString()}</span>
                    {/* Net + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-strong)' }}>₹{Number(row.net_payout || 0).toLocaleString()}</span>
                      {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '12px 20px 16px', background: 'var(--admin-surface-soft)', borderTop: '1px solid var(--admin-border-soft)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {[
                        { label: 'Gross Commission', value: `₹${Number(row.gross_commission || 0).toLocaleString()}`, color: 'var(--admin-text-strong)' },
                        { label: 'Stipend', value: `₹${Number(row.stipend_amount || 0).toLocaleString()}`, color: 'var(--admin-text-strong)' },
                        { label: 'TDS Deducted', value: `₹${Number(row.tds_amount || 0).toLocaleString()}`, color: '#f87171' },
                        { label: 'Net Payout', value: `₹${Number(row.net_payout || 0).toLocaleString()}`, color: '#a855f7' },
                      ].map(item => (
                        <div key={item.label} style={{ background: 'var(--admin-surface-strong)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--admin-border-soft)' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', marginBottom: 6 }}>{item.label}</p>
                          <p style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--admin-surface-soft)', borderTop: '1px solid var(--admin-border-soft)' }}>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{preview.count} ambassador{preview.count !== 1 ? 's' : ''} · {monthLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>Total Net</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-strong)' }}>₹{Number(preview.total_net || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
