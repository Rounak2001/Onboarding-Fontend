import { useAuth } from '../context/AuthContext';
import AccountControls from '../components/AccountControls';

const OnboardingComplete = () => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <AccountControls email={user?.email} compact />
                </div>

                {/* Success icon */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px', fontSize: 40
                }}>
                    ✅
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                    Application Submitted!
                </h1>
                <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, margin: '0 0 32px' }}>
                    Thank you, <strong style={{ color: '#111827' }}>{user?.first_name || user?.email?.split('@')[0]}</strong>. Your onboarding application has been submitted successfully.
                </p>

                {/* Info card */}
                <div style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                    padding: '28px 24px', textAlign: 'left', marginBottom: 24,
                }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📋</span> What happens next?
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', background: '#ecfdf5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0
                            }}>1</div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Verification Checks</p>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>We validate your Government ID, face match, assessment, and qualification documents.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', background: '#ecfdf5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0
                            }}>2</div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Automatic Credential Issue</p>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>As soon as every required onboarding check clears, your consultant credentials are generated automatically.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', background: '#ecfdf5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0
                            }}>3</div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Login Credentials</p>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Your username and password will be emailed to you automatically once the final required check is complete.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notice */}
                <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                    padding: '16px 20px', marginBottom: 28, textAlign: 'left',
                }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, marginTop: 1 }}>⏳</span>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', margin: 0 }}>Verification in Progress</p>
                            <p style={{ fontSize: 13, color: '#a16207', margin: '4px 0 0', lineHeight: 1.5 }}>
                                If any assessment or document check is still processing, your credentials will be emailed automatically as soon as it clears.
                            </p>
                        </div>
                    </div>
                </div>

                <button className="tp-btn tp-signout" onClick={handleLogout} style={{
                    padding: '12px 18px', borderRadius: 12, fontWeight: 900, fontSize: 13,
                    cursor: 'pointer',
                }}>
                    Done — Sign Out
                </button>

                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
                    If you have questions, contact <strong style={{ color: '#6b7280' }}>support@taxplanadvisor.in</strong>
                </p>
            </div>
        </div>
    );
};

export default OnboardingComplete;
