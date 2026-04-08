import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { persistAdminSession } from '../../utils/adminSession';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch(apiUrl('/admin-panel/login/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                persistAdminSession({
                    token: data.token,
                    role: data.role || 'super_admin',
                    username: data.username || username,
                });
                navigate(adminUrl('dashboard'));
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch {
            setError('Server unavailable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            ...themeVars,
            minHeight: '100vh',
            background: 'var(--admin-page-bg-login)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Decorative background elements */}
            <div style={{
                position: 'fixed', top: -120, right: -120,
                width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', bottom: -100, left: -100,
                width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                width: 400, padding: 40, borderRadius: 16,
                background: 'var(--admin-panel-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--admin-border-soft)',
                boxShadow: 'var(--admin-shadow-lg)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                    <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                </div>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <AdminBrandLogo isLight={isLight} height={isLight ? 56 : 52} linked={false} />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Admin Panel</h1>
                    <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginTop: 6 }}>TaxplanAdvisor Management Console</p>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 20,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5', fontSize: 13, textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Username
                        </label>
                        <input
                            value={username} onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-strong)',
                                color: 'var(--admin-text-strong)', fontSize: 14, outline: 'none',
                                transition: 'border 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--admin-border-strong)'}
                        />
                    </div>
                    <div style={{ marginBottom: 28 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Password
                        </label>
                        <input
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-strong)',
                                color: 'var(--admin-text-strong)', fontSize: 14, outline: 'none',
                                transition: 'border 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--admin-border-strong)'}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '13px 0', borderRadius: 10,
                        background: loading ? 'var(--admin-surface-strong)' : 'linear-gradient(135deg, #10b981, #059669)',
                        color: loading ? 'var(--admin-text-secondary)' : '#fff', fontWeight: 600, fontSize: 14,
                        border: loading ? '1px solid var(--admin-border-strong)' : 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: loading ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
                        transition: 'all 0.2s',
                    }}>
                        {loading ? 'Signing in...' : 'Sign In →'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
