import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import { IndianRupee, Users, Megaphone, RefreshCw, Download } from 'lucide-react';

const MONTH_OPTIONS = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

// Financial-year options: current + 4 previous ('YYYY-YY' format, Apr–Mar).
const buildFinancialYearOptions = () => {
    const today = new Date();
    const currentStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const options = [];
    for (let i = 0; i < 5; i += 1) {
        const startYear = currentStartYear - i;
        options.push(`${startYear}-${String(startYear + 1).slice(-2)}`);
    }
    return options;
};

const AdminTdsReport = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;
    const fyOptions = useMemo(() => buildFinancialYearOptions(), []);

    const [financialYear, setFinancialYear] = useState(fyOptions[0]);
    const [month, setMonth] = useState('');
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState({ total_payees: 0, total_gross_amount: 0, total_tds_amount: 0, total_net_paid: 0, ambassador_count: 0, consultant_count: 0 });
    const [payeeFilter, setPayeeFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ financial_year: financialYear });
            if (month) params.set('month', month);
            const res = await fetch(apiUrl(`/admin-panel/tax/tds-report/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return navigate(adminUrl());
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                setError(payload?.error || 'Failed to load TDS report');
                setRows([]);
                return;
            }
            setRows(Array.isArray(payload.rows) ? payload.rows : []);
            setStats(payload.stats || {});
        } catch {
            setError('Failed to load TDS report');
        } finally {
            setLoading(false);
        }
    }, [authHeaders, financialYear, month, navigate]);

    useEffect(() => {
        if (!token) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReport();
    }, [fetchReport, token]);

    const filteredRows = rows.filter((r) => payeeFilter === 'all' || r.payee_type === payeeFilter);

    // format: 'csv' | 'xlsx' — filename extension follows the chosen format;
    // the backend export= query param drives which file the API streams back.
    const downloadReport = async (format = 'csv') => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ financial_year: financialYear, export: format });
            if (month) params.set('month', month);
            const res = await fetch(apiUrl(`/admin-panel/tax/tds-report/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return navigate(adminUrl());
            if (!res.ok) {
                const payload = await readResponsePayload(res);
                alert(payload?.error || 'Export failed');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tds_report_${financialYear}${month ? `_month-${String(month).padStart(2, '0')}` : ''}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1200);
            document.body.removeChild(a);
        } catch {
            alert('Failed to export');
        } finally {
            setExporting(false);
        }
    };

    const summaryCards = [
        { key: 'all', label: 'Total TDS Deducted', value: `₹${Number(stats.total_tds_amount || 0).toLocaleString()}`, color: '#ef4444', icon: IndianRupee, sub: `${stats.total_payees || 0} payees` },
        { key: 'all', label: 'Gross Amount Paid', value: `₹${Number(stats.total_gross_amount || 0).toLocaleString()}`, color: '#3b82f6', icon: IndianRupee, sub: 'Before TDS' },
        { key: 'all', label: 'Net Amount Paid', value: `₹${Number(stats.total_net_paid || 0).toLocaleString()}`, color: '#10b981', icon: IndianRupee, sub: 'After TDS' },
        { key: 'ambassador', label: 'Ambassadors', value: stats.ambassador_count || 0, color: '#8b5cf6', icon: Megaphone, sub: 'Commission payees' },
        { key: 'consultant', label: 'Consultants', value: stats.consultant_count || 0, color: '#f59e0b', icon: Users, sub: 'TDS-applicable payouts' },
    ];

    return (
        <div style={{ ...themeVars }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 14, alignItems: 'center', marginBottom: 20 }}>
                <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    style={{
                        padding: '10px 14px', borderRadius: 12, border: '1px solid var(--admin-border-mid)',
                        background: 'var(--admin-surface-strong)', color: 'var(--admin-text-primary)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {fyOptions.map((fy) => <option key={fy} value={fy}>FY {fy}</option>)}
                </select>
                <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{
                        padding: '10px 14px', borderRadius: 12, border: '1px solid var(--admin-border-mid)',
                        background: 'var(--admin-surface-strong)', color: 'var(--admin-text-primary)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {MONTH_OPTIONS.map((m) => <option key={m.value || 'all'} value={m.value}>{m.label}</option>)}
                </select>
                <div
                    style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px 10px 16px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.25)',
                        background: exporting ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.15)',
                        color: exporting ? 'var(--admin-text-muted)' : '#10b981',
                    }}
                >
                    <button
                        onClick={() => downloadReport('csv')}
                        disabled={exporting || loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                            color: 'inherit', font: 'inherit', fontWeight: 700, fontSize: 13,
                            cursor: exporting || loading ? 'not-allowed' : 'pointer', padding: 0,
                        }}
                    >
                        <Download size={15} /> {exporting ? 'Exporting...' : 'Export'}
                    </button>
                    <select
                        aria-label="Export format"
                        defaultValue="csv"
                        disabled={exporting || loading}
                        onChange={(e) => downloadReport(e.target.value)}
                        style={{
                            border: '1px solid rgba(16,185,129,0.25)', background: 'transparent', color: 'inherit',
                            fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 4px',
                            cursor: exporting || loading ? 'not-allowed' : 'pointer', marginLeft: 4,
                        }}
                    >
                        <option value="csv">CSV</option>
                        <option value="xlsx">XLSX</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 28 }}>
                {summaryCards.map((card, idx) => (
                    <div
                        key={`${card.key}-${idx}`}
                        onClick={() => setPayeeFilter(card.key)}
                        style={{
                            padding: 20, background: 'var(--admin-surface)', borderRadius: 20,
                            border: `1px solid ${payeeFilter === card.key ? card.color : 'var(--admin-border-soft)'}`,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}14`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <card.icon size={18} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--admin-text-primary)', marginBottom: 4 }}>{card.value}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{card.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                        TDS by Payee — FY {financialYear}{month ? ` · ${MONTH_OPTIONS.find((m) => m.value === month)?.label}` : ''}
                    </h3>
                    {payeeFilter !== 'all' && (
                        <button onClick={() => setPayeeFilter('all')} style={{ background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>Clear Filter</button>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
                        <thead style={{ background: 'var(--admin-row-alt)' }}>
                            <tr>
                                <th style={thStyle}>Payee</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>PAN</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Gross Amount</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>TDS Rate</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>TDS Amount</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Net Paid</th>
                                <th style={thStyle}>Date of Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={emptyStyle}><RefreshCw className="spin" size={22} style={{ marginBottom: 10, opacity: 0.5 }} /><div>Loading TDS report...</div></td></tr>
                            ) : error ? (
                                <tr><td colSpan={8} style={emptyStyle}>{error}</td></tr>
                            ) : filteredRows.length > 0 ? (
                                filteredRows.map((r) => (
                                    <tr key={`${r.payee_type}-${r.payee_id}`} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{r.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{r.detail}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                                background: r.payee_type === 'ambassador' ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: r.payee_type === 'ambassador' ? '#8b5cf6' : '#f59e0b',
                                            }}>{r.payee_type}</span>
                                        </td>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{r.pan}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(r.gross_amount || 0).toLocaleString()}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{r.tds_rate_pct}%</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', color: '#ef4444', fontWeight: 800 }}>₹{Number(r.tds_amount || 0).toLocaleString()}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', color: '#10b981', fontWeight: 800 }}>₹{Number(r.net_paid || 0).toLocaleString()}</td>
                                        <td style={tdStyle}>
                                            {r.payment_date
                                                ? new Date(r.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} style={emptyStyle}>No TDS records found for FY {financialYear}.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const thStyle = { padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' };
const tdStyle = { padding: '16px 20px', fontSize: 13, color: 'var(--admin-text-primary)' };
const emptyStyle = { padding: 60, textAlign: 'center', color: 'var(--admin-text-muted)', fontWeight: 600 };

export default AdminTdsReport;
