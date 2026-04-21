import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { ChevronRight, ChevronDown, User, Shield, Briefcase, CreditCard, FileText, Activity, Phone, Mail, ExternalLink, Trash2, Eye, Download, MessageSquare } from 'lucide-react';
import { useAdminTheme } from './adminTheme';

const AdminClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLight, themeVars } = useAdminTheme();
    const token = localStorage.getItem('admin_token');

    const [client, setClient] = useState(null);
    const [subAccounts, setSubAccounts] = useState([]);
    const [serviceRequests, setServiceRequests] = useState([]);
    const [orders, setOrders] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openSections, setOpenSections] = useState(['profile', 'service_requests']);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            
            // In a real app, these would be separate calls or one aggregate detail call
            const [clientRes, subRes, srRes, orderRes, consRes] = await Promise.all([
                fetch(apiUrl(`/admin-panel/clients/${id}/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/sub-accounts/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/service-requests/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/orders/`), { headers }),
                fetch(apiUrl(`/admin-panel/clients/${id}/consultations/`), { headers }),
            ]);

            if (clientRes.ok) setClient(await clientRes.json());
            if (subRes.ok) setSubAccounts(await subRes.json());
            if (srRes.ok) setServiceRequests(await srRes.json());
            if (orderRes.ok) setOrders(await orderRes.json());
            if (consRes.ok) setConsultations(await consRes.json());

        } catch (err) {
            console.error('Failed to fetch client detail', err);
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        if (!token) navigate(adminUrl());
        else fetchDetail();
    }, [fetchDetail, navigate, token]);

    const toggleSection = (sectionId) => {
        setOpenSections(prev => 
            prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
        );
    };

    const SectionHeader = ({ id, label, icon: Icon, color }) => (
        <div 
            onClick={() => toggleSection(id)}
            style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', 
                background: 'var(--admin-surface)', borderBottom: openSections.includes(id) ? '1px solid var(--admin-border-soft)' : 'none', 
                cursor: 'pointer', userSelect: 'none' 
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{label}</h3>
            </div>
            {openSections.includes(id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
    );

    if (loading) return <div style={{ ...themeVars, padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading client profile...</div>;
    if (!client) return <div style={{ ...themeVars, padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Client not found</div>;

    const userData = client.user || {};
    const profileData = client.client_profile || {};

    return (
        <div style={{ ...themeVars, minHeight: '100vh', background: 'var(--admin-page-bg)', padding: '24px' }}>
            {/* Header / Top Bar */}
            <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 24 }}>
                <button 
                    onClick={() => navigate(adminUrl('dashboard'))} 
                    style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
                >
                    ← Back to Dashboard
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#3b82f6', color: '#fff', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(59,130,246,0.2)' }}>
                            {(userData.first_name?.[0] || '') + (userData.last_name?.[0] || '') || <User />}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{userData.first_name} {userData.last_name}</h1>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>@{userData.username}</span>
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>CLIENT</span>
                                {userData.is_active ? 
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Active</span> : 
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Inactive</span>
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Send Magic Link</button>
                        <button style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete Client</button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Profile Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="profile" label="Profile & Identity" icon={User} color="#3b82f6" />
                        {openSections.includes('profile') && (
                            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {[
                                    { label: 'First Name', value: userData.first_name },
                                    { label: 'Last Name', value: userData.last_name },
                                    { label: 'Email', value: userData.email },
                                    { label: 'Phone', value: userData.phone_number },
                                    { label: 'PAN', value: profileData.pan_number || '-' },
                                    { label: 'GSTIN', value: profileData.gstin || '-' },
                                    { label: 'Joined', value: new Date(userData.date_joined).toLocaleDateString() },
                                    { label: 'Portal Username', value: profileData.gst_username || '-' },
                                ].map((field, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{field.label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)' }}>{field.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Service Requests Section */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="service_requests" label="Service Requests" icon={Briefcase} color="#10b981" />
                        {openSections.includes('service_requests') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceRequests.map((sr, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>{sr.service?.title || 'Unknown'}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{sr.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{sr.assigned_consultant?.user?.first_name || 'Unassigned'}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)' }}>{new Date(sr.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {serviceRequests.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No service requests found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Orders & Payments */}
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                        <SectionHeader id="orders" label="Orders & Payments" icon={CreditCard} color="#f59e0b" />
                        {openSections.includes('orders') && (
                            <div style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--admin-row-alt)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Order ID</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Amount</th>
                                            <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700 }}>#{order.id}</td>
                                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#10b981' }}>₹{Number(order.total_amount).toLocaleString()}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: order.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: order.status === 'paid' ? '#10b981' : '#f59e0b' }}>{order.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Download size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No orders found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', padding: 24 }}>
                        <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Quick Stats</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ padding: 16, background: 'var(--admin-row-alt)', borderRadius: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Total Spent</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>₹{Number(orders.reduce((acc, o) => acc + (o.status === 'paid' ? Number(o.total_amount) : 0), 0)).toLocaleString()}</div>
                            </div>
                            <div style={{ padding: 16, background: 'var(--admin-row-alt)', borderRadius: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Services</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{serviceRequests.length}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', padding: 24 }}>
                        <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Document Vault</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--admin-row-alt)', cursor: 'pointer' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>KYC Documents</div>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>4 Files</div>
                                </div>
                                <Eye size={16} color="var(--admin-text-muted)" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--admin-row-alt)', cursor: 'pointer' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={18} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>Tax Returns</div>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>2 Files</div>
                                </div>
                                <Eye size={16} color="var(--admin-text-muted)" />
                            </div>
                        </div>
                        <button style={{ width: '100%', marginTop: 20, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>View All Documents</button>
                    </div>

                    <div style={{ background: 'var(--admin-surface)', borderRadius: 20, border: '1px solid var(--admin-border-soft)', padding: 24 }}>
                        <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Chat Activity</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <MessageSquare size={18} color="#3b82f6" />
                            <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>Last message sent 2 days ago</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminClientDetail;
