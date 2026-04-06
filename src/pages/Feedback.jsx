import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { getOnboardingFeedback, submitOnboardingFeedback } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useIsNarrowScreen } from '../utils/useViewport';

const FEEDBACK_DIFFICULTY_OPTIONS = [
    { value: 'login', label: 'Login / authentication' },
    { value: 'profile', label: 'Profile form' },
    { value: 'identity_verification', label: 'Identity verification' },
    { value: 'face_verification', label: 'Face verification' },
    { value: 'degree_upload', label: 'Degree upload' },
    { value: 'assessment_instructions', label: 'Assessment instructions' },
    { value: 'mcq_section', label: 'MCQ section' },
    { value: 'video_section', label: 'Video section' },
    { value: 'proctoring', label: 'Camera / proctoring' },
    { value: 'technical_issue', label: 'Technical issue' },
    { value: 'other', label: 'Other' },
];

const RATING_OPTIONS = [
    { value: 1, emoji: '😞', label: 'Very Poor' },
    { value: 2, emoji: '😕', label: 'Poor' },
    { value: 3, emoji: '😐', label: 'Average' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Excellent' },
];

const emptyFeedbackForm = {
    experience_rating: 5,
    had_difficulties: false,
    difficulty_categories: [],
    what_went_well: '',
    what_needs_improvement: '',
    difficulties_details: '',
};

const difficultyLabelMap = FEEDBACK_DIFFICULTY_OPTIONS.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
}, {});

/* ─── Inline keyframe injection (once) ─── */
const STYLE_ID = '__feedback_keyframes';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes fbToastIn {
            from { opacity: 0; transform: translateY(-12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fbFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fbPulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: .55; }
        }
    `;
    document.head.appendChild(style);
}

/* ─── Toast ─── */
const FeedbackToast = ({ message }) => {
    if (!message) return null;
    return (
        <div
            style={{
                position: 'fixed',
                top: 24,
                right: 24,
                zIndex: 120,
                maxWidth: 'min(420px, calc(100vw - 32px))',
                padding: '12px 18px',
                borderRadius: 12,
                background: '#0f172a',
                color: '#f1f5f9',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(15,23,42,0.22)',
                animation: 'fbToastIn 280ms ease-out',
                whiteSpace: 'normal',
                lineHeight: 1.5,
            }}
        >
            {message}
        </div>
    );
};

/* ─── Auto-resizing textarea (bottom-border only) ─── */
const GrowTextarea = ({ value, onChange, placeholder, minRows = 3 }) => {
    const ref = useRef(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={minRows}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
                width: '100%',
                boxSizing: 'border-box',
                border: 'none',
                borderBottom: `1.5px solid ${focused ? '#0d9488' : '#cbd5e1'}`,
                outline: 'none',
                padding: '10px 0',
                fontSize: 15,
                lineHeight: 1.7,
                color: '#0f172a',
                background: 'transparent',
                resize: 'none',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'border-color 200ms ease',
            }}
        />
    );
};

/* ─── Main component ─── */
const Feedback = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPhoneScreen = useIsNarrowScreen(640);
    const sidePad = isPhoneScreen ? 20 : 32;

    const [feedbackForm, setFeedbackForm] = useState(emptyFeedbackForm);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackSaving, setFeedbackSaving] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [feedbackEntries, setFeedbackEntries] = useState([]);
    const [toastMessage, setToastMessage] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [hoveredRating, setHoveredRating] = useState(null);

    const latestFeedbackTimestamp = useMemo(() => {
        const latest = feedbackEntries[0];
        if (!latest?.submitted_at) return '';
        return new Date(latest.submitted_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }, [feedbackEntries]);

    useEffect(() => {
        if (!toastMessage) return undefined;
        const id = window.setTimeout(() => setToastMessage(''), 3200);
        return () => window.clearTimeout(id);
    }, [toastMessage]);

    const loadFeedback = useCallback(async () => {
        setFeedbackLoading(true);
        setFeedbackError('');
        try {
            const data = await getOnboardingFeedback();
            const entries = Array.isArray(data?.feedback_entries) ? data.feedback_entries : [];
            setFeedbackEntries(entries);

            const latest = data?.latest_feedback || data?.feedback || null;
            if (latest) {
                setFeedbackForm({
                    experience_rating: Number(latest.experience_rating || 5),
                    had_difficulties: Boolean(latest.had_difficulties),
                    difficulty_categories: Array.isArray(latest.difficulty_categories) ? latest.difficulty_categories : [],
                    what_went_well: latest.what_went_well || '',
                    what_needs_improvement: latest.what_needs_improvement || '',
                    difficulties_details: latest.difficulties_details || '',
                });
            }
        } catch (_error) {
            setFeedbackError('Unable to load feedback right now.');
        } finally {
            setFeedbackLoading(false);
        }
    }, []);

    useEffect(() => { loadFeedback(); }, [loadFeedback]);

    const set = (field, value) => {
        setFeedbackError('');
        setFeedbackForm((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === 'had_difficulties' && value === false) {
                updated.difficulty_categories = [];
                updated.difficulties_details = '';
            }
            return updated;
        });
    };

    const toggleCategory = (cat) => {
        setFeedbackError('');
        setFeedbackForm((prev) => ({
            ...prev,
            difficulty_categories: prev.difficulty_categories.includes(cat)
                ? prev.difficulty_categories.filter((c) => c !== cat)
                : [...prev.difficulty_categories, cat],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedbackSaving(true);
        setFeedbackError('');
        try {
            const payload = {
                ...feedbackForm,
                experience_rating: Number(feedbackForm.experience_rating),
            };
            if (!payload.had_difficulties) {
                payload.difficulty_categories = [];
                payload.difficulties_details = '';
            }
            const response = await submitOnboardingFeedback(payload);
            const entry = response?.feedback_entry || response?.feedback;
            if (entry) setFeedbackEntries((prev) => [entry, ...prev]);
            setToastMessage(response?.message || 'Feedback submitted — thank you!');
        } catch (error) {
            setFeedbackError(error?.response?.data?.error || 'Could not submit feedback right now.');
        } finally {
            setFeedbackSaving(false);
        }
    };

    /* ─── Render ─── */
    return (
        <div style={embedded ? { background: '#ffffff', borderRadius: 16, border: '1px solid #e5e7eb', fontFamily: "'Inter', system-ui, sans-serif" } : { minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <FeedbackToast message={toastMessage} />

            {/* ── Header ── */}
            {!embedded && (
                <header
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        background: '#0d1b2a',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    <div
                        style={{
                            maxWidth: 1500,
                            margin: '0 auto',
                            padding: `0 ${sidePad}px`,
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <BrandLogo height={34} />
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 0',
                                fontFamily: 'inherit',
                                transition: 'color 180ms ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                        >
                            
                        </button>
                    </div>
                </header>
            )}

            {/* ── Content ── */}
            <main
                style={{
                    maxWidth: 1000,
                    margin: '0 auto',
                    padding: embedded ? `${isPhoneScreen ? 24 : 32}px ${sidePad}px ${isPhoneScreen ? 32 : 40}px` : `${isPhoneScreen ? 32 : 48}px ${sidePad}px 80px`,
                }}
            >
                {/* Hero */}
                <div style={{ marginBottom: isPhoneScreen ? 36 : 48 }}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: isPhoneScreen ? 26 : 32,
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.15,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        How was your experience?
                    </h1>
                    <p
                        style={{
                            margin: '12px 0 0',
                            fontSize: 15,
                            lineHeight: 1.65,
                            color: '#64748b',
                            fontWeight: 400,
                        }}
                    >
                        Your feedback helps us improve the onboarding process.
                        Every submission is saved separately.
                    </p>
                    {latestFeedbackTimestamp && (
                        <p
                            style={{
                                margin: '10px 0 0',
                                fontSize: 13,
                                color: '#94a3b8',
                                fontStyle: 'italic',
                            }}
                        >
                            Last submitted {latestFeedbackTimestamp}
                        </p>
                    )}
                </div>

                {feedbackLoading ? (
                    <div style={{ fontSize: 14, color: '#94a3b8', animation: 'fbPulse 1.6s ease-in-out infinite' }}>
                        Loading…
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* ── 1. Rating ── */}
                        <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${isPhoneScreen ? 36 : 44}px` }}>
                            <legend
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    marginBottom: 20,
                                    padding: 0,
                                }}
                            >
                                Overall experience
                            </legend>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    gap: isPhoneScreen ? 12 : 20,
                                }}
                            >
                                {RATING_OPTIONS.map((opt) => {
                                    const isSelected = Number(feedbackForm.experience_rating) === opt.value;
                                    const isHovered = hoveredRating === opt.value;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => set('experience_rating', opt.value)}
                                            onMouseEnter={() => setHoveredRating(opt.value)}
                                            onMouseLeave={() => setHoveredRating(null)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 8,
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                transition: 'transform 180ms ease',
                                                transform: (isSelected || isHovered) ? 'translateY(-3px)' : 'translateY(0)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: isPhoneScreen ? 46 : 54,
                                                    height: isPhoneScreen ? 46 : 54,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: isPhoneScreen ? 22 : 26,
                                                    background: isSelected ? '#f0fdfa' : '#f1f5f9',
                                                    boxShadow: isSelected
                                                        ? '0 0 0 2.5px #0d9488, 0 2px 8px rgba(13,148,136,0.15)'
                                                        : isHovered
                                                            ? '0 2px 8px rgba(15,23,42,0.08)'
                                                            : 'none',
                                                    transition: 'all 200ms ease',
                                                }}
                                            >
                                                {opt.emoji}
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: isSelected ? 600 : 400,
                                                    color: isSelected ? '#0f766e' : '#94a3b8',
                                                    transition: 'color 200ms ease',
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                {opt.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* ── 2. Difficulty Toggle ── */}
                        <div style={{ marginBottom: isPhoneScreen ? 36 : 44 }}>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    marginBottom: 16,
                                }}
                            >
                                Did you face any difficulties?
                            </div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    borderRadius: 999,
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    background: '#f8fafc',
                                }}
                            >
                                {[
                                    { val: false, text: 'No issues' },
                                    { val: true, text: 'Yes, some issues' },
                                ].map((opt) => {
                                    const active = feedbackForm.had_difficulties === opt.val;
                                    const isYes = opt.val === true;
                                    let bg = 'transparent';
                                    let fg = '#64748b';
                                    if (active && !isYes) { bg = '#f0fdf4'; fg = '#166534'; }
                                    if (active && isYes) { bg = '#fef3c7'; fg = '#92400e'; }
                                    return (
                                        <button
                                            key={String(opt.val)}
                                            type="button"
                                            onClick={() => set('had_difficulties', opt.val)}
                                            style={{
                                                border: 'none',
                                                background: bg,
                                                color: fg,
                                                padding: '10px 20px',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                transition: 'all 200ms ease',
                                            }}
                                        >
                                            {opt.text}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── 3. Difficulty Categories (conditional) ── */}
                        {feedbackForm.had_difficulties && (
                            <div
                                style={{
                                    marginBottom: isPhoneScreen ? 36 : 44,
                                    animation: 'fbFadeIn 250ms ease-out',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        marginBottom: 14,
                                    }}
                                >
                                    Where did you face difficulty?
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        marginBottom: 24,
                                    }}
                                >
                                    {FEEDBACK_DIFFICULTY_OPTIONS.map((opt) => {
                                        const selected = feedbackForm.difficulty_categories.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => toggleCategory(opt.value)}
                                                style={{
                                                    padding: '7px 14px',
                                                    borderRadius: 999,
                                                    border: 'none',
                                                    background: selected ? '#dbeafe' : '#f1f5f9',
                                                    color: selected ? '#1e40af' : '#475569',
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 180ms ease',
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <label>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#000000',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Tell us more{' '}
                                        <span style={{ fontWeight: 400, color: '#ffffff' }}></span>
                                    </span>
                                    <GrowTextarea
                                        value={feedbackForm.difficulties_details}
                                        onChange={(e) => set('difficulties_details', e.target.value)}
                                        placeholder="Describe any confusion, delay, or technical issue you experienced."
                                        minRows={2}
                                    />
                                </label>
                            </div>
                        )}

                        {/* ── 4. What went well ── */}
                        <div style={{ marginBottom: isPhoneScreen ? 32 : 40 }}>
                            <label>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        marginBottom: 8,
                                    }}
                                >
                                    What went well?
                                </span>
                                <GrowTextarea
                                    value={feedbackForm.what_went_well}
                                    onChange={(e) => set('what_went_well', e.target.value)}
                                    placeholder="Tell us what worked well in your onboarding journey."
                                />
                            </label>
                        </div>

                        {/* ── 5. What could be better ── */}
                        <div style={{ marginBottom: isPhoneScreen ? 36 : 48 }}>
                            <label>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        marginBottom: 8,
                                    }}
                                >
                                    What could be better?
                                </span>
                                <GrowTextarea
                                    value={feedbackForm.what_needs_improvement}
                                    onChange={(e) => set('what_needs_improvement', e.target.value)}
                                    placeholder="Tell us what should be improved."
                                />
                            </label>
                        </div>

                        {/* ── Error ── */}
                        {feedbackError && (
                            <div
                                style={{
                                    marginBottom: 24,
                                    fontSize: 14,
                                    color: '#b91c1c',
                                    lineHeight: 1.5,
                                }}
                            >
                                {feedbackError}
                            </div>
                        )}

                        {/* ── Submit ── */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="submit"
                                disabled={feedbackSaving}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    background: feedbackSaving ? '#94a3b8' : '#0f172a',
                                    color: '#fff',
                                    padding: isPhoneScreen ? '14px 0' : '14px 48px',
                                    width: isPhoneScreen ? '100%' : 'auto',
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: feedbackSaving ? 'not-allowed' : 'pointer',
                                    transition: 'all 200ms ease',
                                    boxShadow: feedbackSaving ? 'none' : '0 4px 12px rgba(15,23,42,0.12)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!feedbackSaving) e.currentTarget.style.background = '#1e293b';
                                }}
                                onMouseLeave={(e) => {
                                    if (!feedbackSaving) e.currentTarget.style.background = '#0f172a';
                                }}
                            >
                                {feedbackSaving ? 'Submitting…' : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Submission History (collapsible footer) ── */}
                {feedbackEntries.length > 0 && (
                    <div style={{ marginTop: isPhoneScreen ? 48 : 64 }}>
                        <div style={{ borderTop: '1px solid #e2e8f0' }} />
                        <button
                            type="button"
                            onClick={() => setHistoryOpen((p) => !p)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 0',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                                {feedbackEntries.length} previous submission{feedbackEntries.length !== 1 ? 's' : ''}
                            </span>
                            <span
                                style={{
                                    fontSize: 12,
                                    color: '#94a3b8',
                                    transition: 'transform 200ms ease',
                                    transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    display: 'inline-block',
                                }}
                            >
                                ▾
                            </span>
                        </button>

                        {historyOpen && (
                            <div
                                style={{
                                    animation: 'fbFadeIn 200ms ease-out',
                                    paddingBottom: 8,
                                }}
                            >
                                {feedbackEntries.slice(0, 5).map((entry, idx) => (
                                    <div
                                        key={entry.id || idx}
                                        style={{
                                            padding: '14px 0',
                                            borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                flexWrap: 'wrap',
                                                fontSize: 13,
                                                color: '#475569',
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {entry.experience_rating}/5
                                            </span>
                                            <span style={{ color: '#cbd5e1' }}>·</span>
                                            <span>
                                                {entry.submitted_at
                                                    ? new Date(entry.submitted_at).toLocaleString([], {
                                                          dateStyle: 'medium',
                                                          timeStyle: 'short',
                                                      })
                                                    : '—'}
                                            </span>
                                            {Array.isArray(entry.difficulty_categories) &&
                                                entry.difficulty_categories.length > 0 && (
                                                    <>
                                                        <span style={{ color: '#cbd5e1' }}>·</span>
                                                        <span style={{ color: '#64748b' }}>
                                                            {entry.difficulty_categories
                                                                .map(
                                                                    (c) =>
                                                                        difficultyLabelMap[c] ||
                                                                        String(c || '').replace(/_/g, ' ')
                                                                )
                                                                .join(', ')}
                                                        </span>
                                                    </>
                                                )}
                                        </div>
                                        {entry.what_needs_improvement && (
                                            <div
                                                style={{
                                                    marginTop: 6,
                                                    fontSize: 13,
                                                    color: '#94a3b8',
                                                    fontStyle: 'italic',
                                                    lineHeight: 1.5,
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                "{entry.what_needs_improvement}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {feedbackEntries.length > 5 && (
                                    <div style={{ fontSize: 13, color: '#94a3b8', paddingTop: 8 }}>
                                        + {feedbackEntries.length - 5} more
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Feedback;
