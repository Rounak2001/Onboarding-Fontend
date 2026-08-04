import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import { IndianRupee, Building2, User, Download, RefreshCw } from 'lucide-react';

const AdminGstReport = ({ viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM', drives startDate/endDate when set
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState({
        total_invoices: 0, b2b_count: 0, b2c_count: 0,
        b2b_taxable_value: 0, b2b_gst_amount: 0,
        b2c_taxable_value: 0, b2c_gst_amount: 0,
        total_taxable_value: 0, total_gst_amount: 0, state_summary: [],
    });
    const [typeFilter, setTypeFilter] = useState('all'); // all, b2b, b2c
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    // On-screen sub-tabs: 'all' (invoice-level), 'b2b', 'b2c', 'hsn', 'credit_note', 'state'
    const [activeTab, setActiveTab] = useState('all');
    const [tabRows, setTabRows] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [tabError, setTabError] = useState('');

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    // Month quick-filter: 'YYYY-MM' -> sets startDate/endDate to the first/last
    // calendar day of that month, reusing the same start_date/end_date query
    // params everywhere (fetches + CSV exports) — no backend change needed.
    const handleMonthChange = useCallback((value) => {
        setMonthFilter(value);
        if (!value) return;
        const [yearStr, monthStr] = value.split('-');
        const year = Number(yearStr);
        const monthIdx = Number(monthStr) - 1; // 0-based
        const firstDay = new Date(Date.UTC(year, monthIdx, 1));
        const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0));
        const toIso = (d) => d.toISOString().slice(0, 10);
        setStartDate(toIso(firstDay));
        setEndDate(toIso(lastDay));
    }, []);

    // Manually editing From/To clears the month quick-filter so it doesn't
    // silently re-apply / look selected while a custom range is active.
    const handleStartDateChange = useCallback((value) => {
        setMonthFilter('');
        setStartDate(value);
    }, []);
    const handleEndDateChange = useCallback((value) => {
        setMonthFilter('');
        setEndDate(value);
    }, []);

    const buildParams = useCallback((extra = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        Object.entries(extra).forEach(([k, v]) => params.set(k, v));
        return params;
    }, [startDate, endDate]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = buildParams();
            const res = await fetch(apiUrl(`/admin-panel/tax/gst-report/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return navigate(adminUrl());
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                setError(payload?.error || 'Failed to load GST report');
                setRows([]);
                return;
            }
            setRows(Array.isArray(payload.rows) ? payload.rows : []);
            setStats(payload.stats || {});
        } catch {
            setError('Failed to load GST report');
        } finally {
            setLoading(false);
        }
    }, [authHeaders, buildParams, navigate]);

    useEffect(() => {
        if (!token) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReport();
    }, [fetchReport, token]);

    // Config for each on-screen sub-tab: which report_type to fetch (empty = legacy invoice-level)
    // and which JSON key the rows live under.
    const TAB_CONFIG = useMemo(() => ({
        all: { reportType: '', key: 'rows' },
        b2b: { reportType: 'b2b', key: 'b2b_rows' },
        b2c: { reportType: 'b2c', key: 'b2c_summary' },
        hsn: { reportType: 'hsn', key: 'hsn_summary' },
        credit_note: { reportType: 'credit_note', key: 'credit_note_rows' },
        state: { reportType: '', key: '__state_summary__' },
        sales_entry: { reportType: 'sales_entry', key: 'sales_entry_rows' },
    }), []);

    const fetchTab = useCallback(async (tab) => {
        const config = TAB_CONFIG[tab];
        if (!config) return;
        // 'all' and 'state' both reuse the already-fetched legacy payload.
        if (tab === 'all' || tab === 'state') return;
        setTabLoading(true);
        setTabError('');
        try {
            const extra = {};
            if (config.reportType) extra.report_type = config.reportType;
            const params = buildParams(extra);
            const res = await fetch(apiUrl(`/admin-panel/tax/gst-report/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return navigate(adminUrl());
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                setTabError(payload?.error || 'Failed to load report');
                setTabRows([]);
                return;
            }
            setTabRows(Array.isArray(payload[config.key]) ? payload[config.key] : []);
        } catch {
            setTabError('Failed to load report');
        } finally {
            setTabLoading(false);
        }
    }, [TAB_CONFIG, authHeaders, buildParams, navigate]);

    useEffect(() => {
        if (!token) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchTab(activeTab);
    }, [fetchTab, activeTab, token]);

    // Re-fetch the active sub-tab whenever the date filter changes (fetchReport already
    // reruns for 'all'/'state' since they share the legacy payload).
    useEffect(() => {
        if (!token) return;
        if (activeTab === 'all' || activeTab === 'state') return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchTab(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const filteredRows = rows.filter((r) => {
        if (typeFilter === 'b2b') return r.b2b;
        if (typeFilter === 'b2c') return !r.b2b;
        return true;
    });

    // format: 'csv' | 'xlsx' — content-type, blob type and filename extension
    // all follow the chosen format; the backend export= query param drives
    // which file the API actually streams back.
    const downloadReport = async (reportType = '', filenamePrefix = 'gst_report', format = 'csv') => {
        setExporting(true);
        try {
            const extra = { export: format };
            if (reportType) extra.report_type = reportType;
            const params = buildParams(extra);
            const res = await fetch(apiUrl(`/admin-panel/tax/gst-report/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return navigate(adminUrl());
            if (!res.ok) {
                const payload = await readResponsePayload(res);
                alert(payload?.error || 'Export failed');
                return;
            }
            if (format === 'xlsx') {
                const blob = await res.blob();
                if (blob.size === 0) {
                    alert('No data found for the selected period — nothing to export.');
                    return;
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.setTimeout(() => window.URL.revokeObjectURL(url), 1200);
                document.body.removeChild(a);
                return;
            }
            const text = await res.text();
            const dataLineCount = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0).length - 1; // minus header
            if (dataLineCount <= 0) {
                alert('No data found for the selected period — nothing to export.');
                return;
            }
            const blob = new Blob([text], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
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
        { key: 'all', label: 'Total GST Collected', value: `₹${Number(stats.total_gst_amount || 0).toLocaleString()}`, color: '#10b981', icon: IndianRupee, sub: `${stats.total_invoices || 0} invoices` },
        { key: 'all', label: 'Taxable Value', value: `₹${Number(stats.total_taxable_value || 0).toLocaleString()}`, color: '#3b82f6', icon: IndianRupee, sub: 'Before GST' },
        { key: 'b2b', label: 'B2B Invoices', value: stats.b2b_count || 0, color: '#8b5cf6', icon: Building2, sub: `₹${Number(stats.b2b_gst_amount || 0).toLocaleString()} GST` },
        { key: 'b2c', label: 'B2C Invoices', value: stats.b2c_count || 0, color: '#f59e0b', icon: User, sub: `₹${Number(stats.b2c_gst_amount || 0).toLocaleString()} GST` },
    ];

    const money = (v) => `₹${Number(v || 0).toLocaleString()}`;
    const dateLabel = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

    const TABS = [
        { key: 'all', label: 'All Invoices' },
        { key: 'b2b', label: 'B2B' },
        { key: 'b2c', label: 'B2C' },
        { key: 'hsn', label: 'HSN Summary' },
        { key: 'credit_note', label: 'Credit Notes (B2B)' },
        { key: 'state', label: 'State-wise' },
        { key: 'sales_entry', label: 'Sales Entry' },
    ];

    const TAB_DEFS = {
        all: {
            title: 'Invoice-level GST Detail',
            exportType: '', exportPrefix: 'gst_report',
            columns: [
                { key: 'inv', label: 'Invoice', render: (r) => (
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{r.invoice_number}</div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{dateLabel(r.invoice_date)}</div>
                    </div>
                ) },
                { key: 'buyer', label: 'Buyer', render: (r) => r.buyer_legal_name || '-' },
                { key: 'gstin', label: 'GSTIN', render: (r) => r.buyer_gstin || <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>B2C</span> },
                { key: 'state', label: 'State', render: (r) => r.buyer_state_code || '-' },
                { key: 'taxable', label: 'Taxable Value', right: true, render: (r) => <span style={{ fontWeight: 700 }}>{money(r.taxable_value)}</span> },
                { key: 'rate', label: 'GST Rate', right: true, render: (r) => `${r.gst_rate}%` },
                { key: 'gst', label: 'GST Amount', right: true, render: (r) => <span style={{ color: '#10b981', fontWeight: 800 }}>{money(r.gst_amount)}</span> },
                { key: 'total', label: 'Total', right: true, render: (r) => <span style={{ fontWeight: 900 }}>{money(r.total)}</span> },
            ],
        },
        b2b: {
            title: 'GSTR-1 B2B Invoices',
            exportType: 'b2b', exportPrefix: 'gstr1_b2b',
            columns: [
                { key: 'inv', label: 'Invoice No.', render: (r) => r.invoice_number },
                { key: 'name', label: 'Customer Name', render: (r) => r.customer_name },
                { key: 'gstin', label: 'GSTIN', render: (r) => r.gstin },
                { key: 'date', label: 'Invoice Date', render: (r) => dateLabel(r.invoice_date) },
                { key: 'value', label: 'Invoice Value', right: true, render: (r) => money(r.invoice_value) },
                { key: 'rate', label: 'Tax Rate(%)', right: true, render: (r) => r.tax_rate_pct },
                { key: 'taxable', label: 'Taxable Value', right: true, render: (r) => money(r.taxable_value) },
                { key: 'igst', label: 'IGST', right: true, render: (r) => money(r.igst) },
                { key: 'cgst', label: 'Central Tax', right: true, render: (r) => money(r.central_tax) },
                { key: 'sgst', label: 'State Tax', right: true, render: (r) => money(r.state_tax) },
                { key: 'cess', label: 'Cess', right: true, render: (r) => money(r.cess) },
                { key: 'pos', label: 'State of supply', render: (r) => r.state_of_supply },
            ],
        },
        b2c: {
            title: 'GSTR-1 B2C Summary',
            exportType: 'b2c', exportPrefix: 'gstr1_b2c',
            columns: [
                { key: 'pos', label: 'State of supply', render: (r) => r.state_of_supply },
                { key: 'rate', label: 'Tax Rate(%)', right: true, render: (r) => r.tax_rate_pct },
                { key: 'taxable', label: 'Total Taxable Value', right: true, render: (r) => money(r.total_taxable_value) },
                { key: 'igst', label: 'IGST', right: true, render: (r) => money(r.igst) },
                { key: 'cgst', label: 'Central Tax', right: true, render: (r) => money(r.central_tax) },
                { key: 'sgst', label: 'State Tax', right: true, render: (r) => money(r.state_tax) },
                { key: 'cess', label: 'Cess', right: true, render: (r) => money(r.cess) },
                { key: 'net', label: 'Net', right: true, render: (r) => <span style={{ fontWeight: 800 }}>{money(r.net_amount)}</span> },
            ],
        },
        hsn: {
            title: 'GSTR-1 HSN/SAC Summary',
            exportType: 'hsn', exportPrefix: 'gstr1_hsn_summary',
            columns: [
                { key: 'hsn', label: 'HSN', render: (r) => r.hsn },
                { key: 'details', label: 'Details', render: (r) => r.details },
                { key: 'uom', label: 'Unit of measurement', render: (r) => r.unit_of_measurement },
                { key: 'qty', label: 'Total Quantity', right: true, render: (r) => r.total_quantity },
                { key: 'rate', label: 'Tax Rate(%)', right: true, render: (r) => r.tax_rate_pct },
                { key: 'taxable', label: 'Total Taxable Value', right: true, render: (r) => money(r.total_taxable_value) },
                { key: 'igst', label: 'IGST', right: true, render: (r) => money(r.igst) },
                { key: 'cgst', label: 'Central Tax', right: true, render: (r) => money(r.central_tax) },
                { key: 'sgst', label: 'State Tax', right: true, render: (r) => money(r.state_tax) },
                { key: 'cess', label: 'Cess', right: true, render: (r) => money(r.cess) },
                { key: 'net', label: 'Net', right: true, render: (r) => <span style={{ fontWeight: 800 }}>{money(r.net_amount)}</span> },
            ],
        },
        credit_note: {
            title: 'GSTR-1 Credit Notes (B2B only)',
            exportType: 'credit_note', exportPrefix: 'gstr1_credit_notes_b2b',
            columns: [
                { key: 'ref', label: 'Reference Invoice No.', render: (r) => r.reference_invoice_number },
                { key: 'name', label: 'Customer Name', render: (r) => r.customer_name },
                { key: 'gstin', label: 'GSTIN', render: (r) => r.gstin },
                { key: 'date', label: 'Invoice Date', render: (r) => dateLabel(r.invoice_date) },
                { key: 'note', label: 'Note Value', right: true, render: (r) => money(r.note_value) },
                { key: 'taxable', label: 'Taxable Value', right: true, render: (r) => money(r.taxable_value) },
                { key: 'igst', label: 'IGST', right: true, render: (r) => money(r.igst) },
                { key: 'cgst', label: 'Central Tax', right: true, render: (r) => money(r.central_tax) },
                { key: 'sgst', label: 'State Tax', right: true, render: (r) => money(r.state_tax) },
                { key: 'cess', label: 'Cess', right: true, render: (r) => money(r.cess) },
                { key: 'pos', label: 'State of supply', render: (r) => r.state_of_supply },
            ],
        },
        state: {
            title: 'State-wise GST Summary',
            exportType: null, exportPrefix: '',
            columns: [
                { key: 'state', label: 'State', render: (r) => r.state_code },
                { key: 'taxable', label: 'Taxable Value', right: true, render: (r) => money(r.taxable_value) },
                { key: 'gst', label: 'GST Amount', right: true, render: (r) => <span style={{ color: '#10b981', fontWeight: 800 }}>{money(r.gst_amount)}</span> },
                { key: 'total', label: 'Total', right: true, render: (r) => <span style={{ fontWeight: 900 }}>{money(r.total)}</span> },
            ],
        },
        sales_entry: {
            title: 'Sales Entry (Accounting / Tally Import)',
            exportType: 'sales_entry', exportPrefix: 'sales_entry',
            columns: [
                { key: 'date', label: 'Invoice Date', render: (r) => dateLabel(r.invoice_date) },
                { key: 'inv', label: 'Invoice Number', render: (r) => r.invoice_number || '-' },
                { key: 'hsn', label: 'HSN Code', render: (r) => r.hsn_code || '-' },
                { key: 'gstin', label: 'GST Number', render: (r) => r.gst_number || <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>B2C</span> },
                { key: 'name', label: 'Customer Name', render: (r) => r.customer_name || '-' },
                { key: 'state', label: 'State', render: (r) => r.state || '-' },
                { key: 'country', label: 'Country', render: (r) => r.country || '-' },
                { key: 'taxable', label: 'Taxable Value', right: true, render: (r) => money(r.taxable_value) },
                { key: 'discount', label: 'Discount Value', right: true, render: (r) => money(r.discount_amount) },
                { key: 'total', label: 'Total Amount', right: true, render: (r) => <span style={{ fontWeight: 800 }}>{money(r.total_amount)}</span> },
                { key: 'cgst', label: 'CGST', right: true, render: (r) => money(r.cgst) },
                { key: 'sgst', label: 'SGST', right: true, render: (r) => money(r.sgst) },
                { key: 'igst', label: 'IGST', right: true, render: (r) => money(r.igst) },
                { key: 'tds', label: 'TDS', right: true, render: (r) => money(r.tds) },
                { key: 'round_off', label: 'Round Off', right: true, render: (r) => money(r.round_off) },
                { key: 'narration', label: 'Narration', render: (r) => <span style={{ fontSize: 11.5 }}>{r.narration}</span> },
            ],
        },
    };

    const activeTabConfig = TAB_DEFS[activeTab];
    const activeData = activeTab === 'all'
        ? filteredRows
        : activeTab === 'state'
            ? (stats.state_summary || [])
            : tabRows;
    const activeLoading = activeTab === 'all' ? loading : (activeTab === 'state' ? loading : tabLoading);
    const activeError = activeTab === 'all' ? error : (activeTab === 'state' ? error : tabError);

    return (
        <div style={{ ...themeVars }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 14, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>Month</label>
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        style={dateInputStyle}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        style={dateInputStyle}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        style={dateInputStyle}
                    />
                </div>
                {(startDate || endDate) && (
                    <button onClick={() => { setStartDate(''); setEndDate(''); setMonthFilter(''); }} style={{ background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>Clear</button>
                )}
                <div style={{ marginLeft: 'auto' }}>
                    <ExportButton reportType="" filenamePrefix="gst_report" label="Export" bg="rgba(16,185,129,0.15)" border="rgba(16,185,129,0.25)" color="#10b981" exporting={exporting} loading={loading} onExport={downloadReport} />
                </div>
                <ExportButton reportType="b2b" filenamePrefix="gstr1_b2b" label="Export B2B" bg="rgba(139,92,246,0.15)" border="rgba(139,92,246,0.25)" color="#8b5cf6" title="GSTR-1 B2B invoices — one row per invoice with a buyer GSTIN" exporting={exporting} loading={loading} onExport={downloadReport} />
                <ExportButton reportType="b2c" filenamePrefix="gstr1_b2c" label="Export B2C" bg="rgba(245,158,11,0.15)" border="rgba(245,158,11,0.25)" color="#f59e0b" title="GSTR-1 B2C summary — grouped by state of supply and tax rate" exporting={exporting} loading={loading} onExport={downloadReport} />
                <ExportButton reportType="hsn" filenamePrefix="gstr1_hsn_summary" label="Export HSN Summary" bg="rgba(59,130,246,0.15)" border="rgba(59,130,246,0.25)" color="#3b82f6" title="GSTR-1 HSN/SAC summary — grouped by HSN code and description" exporting={exporting} loading={loading} onExport={downloadReport} />
                <ExportButton reportType="credit_note" filenamePrefix="gstr1_credit_notes_b2b" label="Export Credit Notes (B2B)" bg="rgba(239,68,68,0.15)" border="rgba(239,68,68,0.25)" color="#ef4444" title="GSTR-1 Credit Notes (B2B only) — invoices whose order was cancelled after issuance" exporting={exporting} loading={loading} onExport={downloadReport} />
                <ExportButton reportType="sales_entry" filenamePrefix="sales_entry" label="Export Sales Entry" bg="rgba(20,184,166,0.15)" border="rgba(20,184,166,0.25)" color="#14b8a6" title="Accounting/Tally-style sales entry export — one row per invoice" exporting={exporting} loading={loading} onExport={downloadReport} />
                <ExportButton reportType="docs" filenamePrefix="gstr1_documents_summary" label="Export Documents Summary" bg="rgba(236,72,153,0.15)" border="rgba(236,72,153,0.25)" color="#ec4899" title="GSTR-1 Documents summary — invoice numbering range per year" exporting={exporting} loading={loading} onExport={downloadReport} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 24 }}>
                {summaryCards.map((card, idx) => (
                    <div
                        key={`${card.key}-${idx}`}
                        onClick={() => setTypeFilter(card.key)}
                        style={{
                            padding: 20, background: 'var(--admin-surface)', borderRadius: 20,
                            border: `1px solid ${typeFilter === card.key ? card.color : 'var(--admin-border-soft)'}`,
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

            {stats.state_summary && stats.state_summary.length > 0 && (
                <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', padding: '18px 22px', marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>State-wise GST Summary</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {stats.state_summary.slice(0, 12).map((s) => (
                            <div key={s.state_code} style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--admin-row-alt)', minWidth: 130 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{s.state_code}</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>₹{Number(s.gst_amount || 0).toLocaleString()}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--admin-text-muted)' }}>Taxable ₹{Number(s.taxable_value || 0).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '9px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                            border: `1px solid ${activeTab === t.key ? 'var(--admin-accent, #10b981)' : 'var(--admin-border-soft)'}`,
                            background: activeTab === t.key ? 'var(--admin-row-alt)' : 'var(--admin-surface)',
                            color: activeTab === t.key ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{activeTabConfig.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {activeTab === 'all' && typeFilter !== 'all' && (
                            <button onClick={() => setTypeFilter('all')} style={{ background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>Clear Filter</button>
                        )}
                        {activeTabConfig.exportType !== null && (
                            <ExportButton
                                reportType={activeTabConfig.exportType}
                                filenamePrefix={activeTabConfig.exportPrefix}
                                label="Export"
                                bg="rgba(16,185,129,0.15)"
                                border="rgba(16,185,129,0.25)"
                                color="#10b981"
                                compact
                                exporting={exporting}
                                loading={activeLoading}
                                onExport={downloadReport}
                            />
                        )}
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                        <thead style={{ background: 'var(--admin-row-alt)' }}>
                            <tr>
                                {activeTabConfig.columns.map((col) => (
                                    <th key={col.key} style={{ ...thStyle, ...(col.right ? { textAlign: 'right' } : {}) }}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeLoading ? (
                                <tr><td colSpan={activeTabConfig.columns.length} style={emptyStyle}><RefreshCw className="spin" size={22} style={{ marginBottom: 10, opacity: 0.5 }} /><div>Loading...</div></td></tr>
                            ) : activeError ? (
                                <tr><td colSpan={activeTabConfig.columns.length} style={emptyStyle}>{activeError}</td></tr>
                            ) : activeData.length > 0 ? (
                                activeData.map((r, idx) => (
                                    <tr key={r.invoice_id ?? r.invoice_number ?? r.state_code ?? idx} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                        {activeTabConfig.columns.map((col) => (
                                            <td key={col.key} style={{ ...tdStyle, ...(col.right ? { textAlign: 'right' } : {}) }}>{col.render(r)}</td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={activeTabConfig.columns.length} style={emptyStyle}>No data found for the selected period.</td></tr>
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
const dateInputStyle = {
    padding: '9px 12px', borderRadius: 10, border: '1px solid var(--admin-border-mid)',
    background: 'var(--admin-surface-strong)', color: 'var(--admin-text-primary)', fontSize: 12.5, fontWeight: 600,
};

// Compact per-button format control — there are already several export
// buttons in the toolbar row, so doubling the button count (a separate CSV
// button + XLSX button each) would clutter it. A small format select next
// to each button lets the admin pick CSV or XLSX without adding buttons.
// Declared at module scope (not inline in AdminGstReport) so its identity
// stays stable across renders.
const ExportButton = ({ reportType, filenamePrefix, label, bg, border, color, title, compact = false, exporting, loading, onExport }) => {
    const buttonStyle = {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: compact ? '7px 10px 7px 14px' : '10px 12px 10px 16px',
        borderRadius: 12, border: `1px solid ${border}`,
        background: exporting ? 'var(--admin-row-alt)' : bg,
        color: exporting ? 'var(--admin-text-muted)' : color,
        fontWeight: 700, fontSize: compact ? 12 : 13,
        cursor: exporting || loading ? 'not-allowed' : 'pointer',
    };
    const selectStyle = {
        border: `1px solid ${border}`, background: 'transparent',
        color: exporting ? 'var(--admin-text-muted)' : color,
        fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 4px',
        cursor: exporting || loading ? 'not-allowed' : 'pointer', marginLeft: 4,
    };
    return (
        <div style={buttonStyle} title={title}>
            <button
                onClick={() => onExport(reportType, filenamePrefix, 'csv')}
                disabled={exporting || loading}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'inherit', font: 'inherit', fontWeight: 'inherit', cursor: 'inherit', padding: 0 }}
            >
                <Download size={compact ? 13 : 15} /> {exporting ? 'Exporting...' : label}
            </button>
            <select
                aria-label={`${label} format`}
                defaultValue="csv"
                disabled={exporting || loading}
                onChange={(e) => onExport(reportType, filenamePrefix, e.target.value)}
                style={selectStyle}
            >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
            </select>
        </div>
    );
};

export default AdminGstReport;
