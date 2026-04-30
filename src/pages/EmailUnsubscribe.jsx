import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, BellOff, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { unsubscribeOnboardingReminderEmails } from '../services/api';

const cardStyle = {
  width: '100%',
  maxWidth: 640,
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid rgba(148,163,184,0.22)',
  borderRadius: 28,
  boxShadow: '0 30px 80px rgba(15,23,42,0.12)',
  backdropFilter: 'blur(18px)',
  overflow: 'hidden',
};

const EmailUnsubscribe = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This unsubscribe link is missing its token.');
      return;
    }

    let active = true;

    const run = async () => {
      try {
        const data = await unsubscribeOnboardingReminderEmails(token);
        if (!active) return;
        setStatus('success');
        setMessage(data?.message || 'Onboarding reminder emails are now turned off.');
      } catch (error) {
        if (!active) return;
        const detail = error?.response?.data?.error || 'We could not update your email preference.';
        setStatus('error');
        setMessage(detail);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [token]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 36%), linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={cardStyle}>
        <div style={{
          padding: '28px 28px 22px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          color: '#fff',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <BellOff size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>Email Preferences</h1>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 1.6 }}>
            This stops non-essential onboarding reminder emails. OTP, login, and credential emails will still be sent.
          </p>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            padding: 18,
            borderRadius: 18,
            background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
            border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.18)' : 'rgba(59,130,246,0.18)'}`,
            marginBottom: 22,
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: isSuccess ? 'rgba(16,185,129,0.14)' : 'rgba(59,130,246,0.14)',
              color: isSuccess ? '#059669' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : isSuccess ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {isLoading ? 'Updating your preference...' : isSuccess ? 'You are unsubscribed' : 'Something went wrong'}
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#475569' }}>
                {isLoading ? 'Please wait a moment while we update your onboarding reminder settings.' : message}
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 22,
          }}>
            {[
              { icon: <ShieldCheck size={18} />, title: 'Essential emails stay on', text: 'We still send security, OTP, and credential messages.' },
              { icon: <BellOff size={18} />, title: 'Reminders are muted', text: 'You will stop receiving onboarding nudges and follow-ups.' },
            ].map((item) => (
              <div key={item.title} style={{
                padding: 16,
                borderRadius: 18,
                border: '1px solid rgba(148,163,184,0.18)',
                background: '#fff',
              }}>
                <div style={{ color: '#1d4ed8', marginBottom: 10 }}>{item.icon}</div>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.title}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Change your mind later? Contact support or ask an admin to re-enable reminders.
            </p>
            <Link to="/" style={{
              textDecoration: 'none',
              padding: '11px 16px',
              borderRadius: 999,
              background: '#0f172a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
            }}>
              Go to site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailUnsubscribe;
