import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { completeOnboarding, sendOnboardingPhoneOtp, uploadOnboardingDocument, verifyOnboardingPhoneOtp } from '../services/api';
import FileDropzone from '../components/FileDropzone';
import AccountControls from '../components/AccountControls';

const Onboarding = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateUser, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [experienceLetter, setExperienceLetter] = useState(null);
    const experienceLetterRef = useRef(null);
    const phoneInputRef = useRef(null);
    const firstNameRef = useRef(null);
    const lastNameRef = useRef(null);
    const dobRef = useRef(null);
    const address1Ref = useRef(null);
    const cityRef = useRef(null);
    const stateRef = useRef(null);
    const pincodeRef = useRef(null);
    const yearsExpRef = useRef(null);
    const isDetailsEdit = location.pathname === '/onboarding/details';
    const identityMismatchNotice = location.state?.identityMismatchMessage || '';

    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        middle_name: user?.middle_name || '',
        last_name: user?.last_name || '',
        age: user?.age || '',
        dob: user?.dob || '',
        phone_number: user?.phone_number || '',
        address_line1: user?.address_line1 || '',
        address_line2: user?.address_line2 || '',
        city: user?.city || '',
        state: user?.state || '',
        pincode: user?.pincode || '',
        practice_type: user?.practice_type || 'Individual',
        years_of_experience: user?.years_of_experience || '',
    });

    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpMessage, setOtpMessage] = useState('');
    const [otpError, setOtpError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [devOtp, setDevOtp] = useState('');
    const [otpPhoneDisplay, setOtpPhoneDisplay] = useState('');
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const otpBoxRefs = useRef([]);

    const [pinLookup, setPinLookup] = useState({ loading: false, error: '', autofilled: false, pin: '' });
    const pinCacheRef = useRef(new Map());
    const pinFetchTimerRef = useRef(null);
    const cityManuallyEditedRef = useRef(false);
    const stateManuallyEditedRef = useRef(false);

    const normalizeIndianPhone = (raw) => {
        const digits = String(raw || '').replace(/\D/g, '');
        let d = digits;
        if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
        if (d.length !== 10) return null;
        if (!/^[6-9]\d{9}$/.test(d)) return null;
        return `+91${d}`;
    };

    const currentPhoneE164 = normalizeIndianPhone(formData.phone_number);
    const userPhoneE164 = normalizeIndianPhone(user?.phone_number);
    const isPhoneVerified = Boolean(user?.is_phone_verified) && !!currentPhoneE164 && currentPhoneE164 === userPhoneE164;

    const otpValue = otpDigits.join('');
    const otpComplete = otpDigits.every((d) => /^\d$/.test(d));

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const id = setInterval(() => {
            setResendCooldown((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [resendCooldown]);

    useEffect(() => {
        if (!otpMessage) return;
        const id = setTimeout(() => setOtpMessage(''), 4500);
        return () => clearTimeout(id);
    }, [otpMessage]);

    useEffect(() => {
        if (!otpModalOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOtpModalOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        const focusId = setTimeout(() => {
            const idx = otpDigits.findIndex((d) => !d);
            const target = otpBoxRefs.current[idx === -1 ? 0 : idx];
            target?.focus?.();
        }, 50);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
            clearTimeout(focusId);
        };
    }, [otpModalOpen, otpDigits]);

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age >= 0 ? age : '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'dob') {
            setFormData(prev => ({ ...prev, dob: value, age: calculateAge(value) }));
            if (errors.dob || errors.age) setErrors(prev => ({ ...prev, dob: null, age: null }));
            if (formError) setFormError('');
        } else if (name === 'phone_number') {
            setFormData(prev => ({ ...prev, phone_number: value }));
            setOtpDigits(['', '', '', '', '', '']);
            setOtpSent(false);
            setOtpMessage('');
            setOtpError('');
            setDevOtp('');
            setResendCooldown(0);
            setOtpPhoneDisplay('');
            setOtpModalOpen(false);
            if (errors.phone_number) setErrors(prev => ({ ...prev, phone_number: null }));
            if (formError) setFormError('');
        } else if (name === 'pincode') {
            const digits = String(value || '').replace(/\D/g, '').slice(0, 6);
            setFormData(prev => ({ ...prev, pincode: digits }));
            if (errors.pincode) setErrors(prev => ({ ...prev, pincode: null }));
            if (pinLookup.error) setPinLookup(prev => ({ ...prev, error: '' }));
            if (formError) setFormError('');
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
            if (formError) setFormError('');
        }

        if (name === 'city') cityManuallyEditedRef.current = true;
        if (name === 'state') stateManuallyEditedRef.current = true;
    };

    const validate = () => {
        const e = {};
        if (!formData.first_name?.trim() || formData.first_name.trim().length < 2) e.first_name = 'First name required (min 2 chars)';
        if (!formData.last_name?.trim()) e.last_name = 'Last name required';
        if (!formData.dob) {
            e.dob = 'Date of birth required';
        } else {
            const age = calculateAge(formData.dob);
            if (age < 18) e.dob = 'Must be at least 18 years old';
            if (age > 100) e.dob = 'Please enter a valid date of birth';
            if (new Date(formData.dob) > new Date()) e.dob = 'Date of birth cannot be in the future';
        }
        if (!formData.phone_number?.trim() || formData.phone_number.trim().length < 10) e.phone_number = 'Valid phone number required (10+ digits)';
        if (formData.phone_number?.trim() && !currentPhoneE164) e.phone_number = 'Please enter a valid Indian mobile number (+91 XXXXXXXXXX)';
        if (currentPhoneE164 && !isPhoneVerified) e.phone_number = 'Please verify your phone number via OTP to continue';
        if (!formData.address_line1?.trim() || formData.address_line1.trim().length < 5) e.address_line1 = 'Address required (min 5 chars)';
        if (!formData.city?.trim()) e.city = 'City required';
        if (!formData.state?.trim()) e.state = 'State required';
        if (!formData.pincode?.trim() || !/^\d{6}$/.test(String(formData.pincode).trim())) e.pincode = 'Valid pincode required (6 digits)';
        if (!formData.years_of_experience || Number(formData.years_of_experience) < 1) e.years_of_experience = 'Years of experience is required';
        return e;
    };

    const fieldOrder = useMemo(() => ([
        ['first_name', firstNameRef],
        ['last_name', lastNameRef],
        ['dob', dobRef],
        ['phone_number', phoneInputRef],
        ['address_line1', address1Ref],
        ['city', cityRef],
        ['state', stateRef],
        ['pincode', pincodeRef],
        ['years_of_experience', yearsExpRef],
    ]), []);

    const focusFirstError = (errs) => {
        for (const [key, ref] of fieldOrder) {
            if (errs[key]) {
                const el = ref?.current;
                if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (el?.focus) el.focus();
                break;
            }
        }
    };

    const handleSendOtp = async () => {
        setOtpSending(true);
        setOtpMessage('');
        setOtpError('');
        setDevOtp('');
        try {
            const data = await sendOnboardingPhoneOtp(formData.phone_number);
            setOtpSent(true);
            setResendCooldown(Number(data.cooldown || 30));
            setOtpMessage(data.message || 'OTP sent.');
            setOtpPhoneDisplay(data.phone_display || '');
            setOtpModalOpen(true);
            if (import.meta.env.DEV && data.debug_otp) {
                setDevOtp(String(data.debug_otp));
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send OTP. Please try again.';
            setOtpError(msg);
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        setOtpVerifying(true);
        setOtpMessage('');
        setOtpError('');
        try {
            const data = await verifyOnboardingPhoneOtp(formData.phone_number, otpValue);
            if (data?.user) {
                updateUser(data.user);
                if (data.user.phone_number) {
                    setFormData((prev) => ({ ...prev, phone_number: data.user.phone_number }));
                }
            }
            setOtpMessage(data.message || 'Phone verified.');
            setOtpError('');
            setOtpDigits(['', '', '', '', '', '']);
            setOtpSent(false);
            setResendCooldown(0);
            setDevOtp('');
            setOtpPhoneDisplay('');
            setOtpModalOpen(false);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid OTP. Please try again.';
            setOtpError(msg);
        } finally {
            setOtpVerifying(false);
        }
    };

    const setExperienceLetterFromFile = (file) => {
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) {
            setErrors(prev => ({ ...prev, experience_letter: 'Only PDF, JPG, JPEG, PNG are allowed' }));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, experience_letter: 'File must be under 10MB' }));
            return;
        }
        setExperienceLetter(file);
        setErrors(prev => ({ ...prev, experience_letter: null }));
    };

    const handleExperienceLetter = (e) => {
        const file = e.target.files[0];
        setExperienceLetterFromFile(file);
    };

    const normalizeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

    const normalizeStateForSelect = (apiState) => {
        const apiKey = normalizeKey(apiState);
        const stateOptions = indianStates;
        for (const opt of stateOptions) {
            if (normalizeKey(opt) === apiKey) return opt;
        }
        // Common variants
        const aliases = {
            nctofdelhi: 'Delhi',
            odisha: 'Odisha',
            orissa: 'Odisha',
        };
        return aliases[apiKey] || apiState;
    };

    const lookupPin = async (pin) => {
        if (!/^\d{6}$/.test(pin)) return;

        if (pinCacheRef.current.has(pin)) {
            const cached = pinCacheRef.current.get(pin);
            if (cached?.error) {
                setPinLookup({ loading: false, error: cached.error, autofilled: false, pin });
                return;
            }
            const nextCity = cached?.city || '';
            const nextState = cached?.state || '';
            setFormData(prev => ({
                ...prev,
                city: (cityManuallyEditedRef.current && prev.city) ? prev.city : (prev.city || nextCity),
                state: (stateManuallyEditedRef.current && prev.state) ? prev.state : (prev.state || nextState),
            }));
            setPinLookup({ loading: false, error: '', autofilled: Boolean(nextCity || nextState), pin });
            return;
        }

        setPinLookup({ loading: true, error: '', autofilled: false, pin });
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { method: 'GET' });
            const data = await res.json();
            const row = Array.isArray(data) ? data[0] : null;
            const status = String(row?.Status || '').toLowerCase();
            if (!row || status !== 'success' || !Array.isArray(row.PostOffice) || row.PostOffice.length === 0) {
                const msg = 'Invalid pincode. Please check and try again.';
                pinCacheRef.current.set(pin, { error: msg });
                setPinLookup({ loading: false, error: msg, autofilled: false, pin });
                return;
            }

            const first = row.PostOffice.find(p => p?.State || p?.District) || row.PostOffice[0];
            const cityFromApi = (first?.District || first?.Block || first?.Taluk || '').trim();
            const stateFromApi = normalizeStateForSelect((first?.State || '').trim());

            pinCacheRef.current.set(pin, { city: cityFromApi, state: stateFromApi });

            setFormData(prev => ({
                ...prev,
                city: (cityManuallyEditedRef.current && prev.city) ? prev.city : (prev.city || cityFromApi),
                state: (stateManuallyEditedRef.current && prev.state) ? prev.state : (prev.state || stateFromApi),
            }));

            setPinLookup({ loading: false, error: '', autofilled: Boolean(cityFromApi || stateFromApi), pin });
        } catch (e) {
            const msg = 'Could not fetch city/state for this pincode. Please fill manually.';
            pinCacheRef.current.set(pin, { error: msg });
            setPinLookup({ loading: false, error: msg, autofilled: false, pin });
        }
    };

    useEffect(() => {
        const pin = String(formData.pincode || '').trim();
        if (!/^\d{6}$/.test(pin)) {
            if (pinFetchTimerRef.current) clearTimeout(pinFetchTimerRef.current);
            setPinLookup(prev => ({ ...prev, loading: false, error: prev.pin ? prev.error : '', autofilled: false, pin }));
            return;
        }
        if (pinFetchTimerRef.current) clearTimeout(pinFetchTimerRef.current);
        pinFetchTimerRef.current = setTimeout(() => lookupPin(pin), 450);
        return () => {
            if (pinFetchTimerRef.current) clearTimeout(pinFetchTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.pincode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        if (Object.keys(v).length > 0) {
            setErrors(v);
            setFormError('Please fill all required fields to continue.');
            focusFirstError(v);
            return;
        }
        setLoading(true);
        try {
            const data = await completeOnboarding(formData);
            if (!isDetailsEdit) {
                if (experienceLetter) {
                    const letterData = new FormData();
                    letterData.append('document_type', 'experience_letter');
                    letterData.append('title', 'Experience Letter');
                    letterData.append('file', experienceLetter);
                    await uploadOnboardingDocument(letterData);
                }
            }
            updateUser(data.user);
            navigate(isDetailsEdit ? '/onboarding/identity' : '/success');
        } catch (err) {
            console.error('Onboarding failed:', err);
            if (experienceLetter && err.response?.data?.document_type) {
                setErrors(prev => ({ ...prev, experience_letter: 'Failed to upload experience letter. Please try again.' }));
                return;
            }
            if (err.response?.data) {
                const be = {};
                Object.entries(err.response.data).forEach(([k, v]) => { be[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(be);
            }
        } finally { setLoading(false); }
    };

    const indianStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
        'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
        'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
        'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
        'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    const today = new Date();
    const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minDob = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    const inputStyle = (hasError) => ({
        width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
        border: hasError ? '1px solid #fca5a5' : '1px solid #d1d5db',
        background: hasError ? '#fef2f2' : '#fff', outline: 'none',
        transition: 'border 0.2s',
    });

    const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
    const errorStyle = { fontSize: 12, color: '#ef4444', marginTop: 4 };

    const handleSignOut = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="tp-page" style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Header */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>T</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Taxplan Advisor</span>
                    <div style={{ marginLeft: 'auto' }}>
                        <AccountControls email={user?.email} onSignOut={handleSignOut} />
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 60px' }}>
                {/* Title */}
                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 1 of 5</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Complete Your Profile</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Fill in your details accurately. This information is used for verification.</p>
                </div>

                {identityMismatchNotice && (
                    <div style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#92400e' }}>
                        {identityMismatchNotice}
                    </div>
                )}

                {formError && (
                    <div style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#991b1b' }}>
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Personal Information</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input ref={firstNameRef} name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Enter first name" style={inputStyle(errors.first_name)} />
                                {errors.first_name && <p style={errorStyle}>{errors.first_name}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Middle Name</label>
                                <input name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Enter middle name" style={inputStyle(false)} />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input ref={lastNameRef} name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Enter last name" style={inputStyle(errors.last_name)} />
                                {errors.last_name && <p style={errorStyle}>{errors.last_name}</p>}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
                            <div>
                                <label style={labelStyle}>Date of Birth <span style={{ color: '#ef4444' }}>*</span></label>
                                <input ref={dobRef} type="date" name="dob" value={formData.dob} onChange={handleChange}
                                    max={maxDob} min={minDob}
                                    style={inputStyle(errors.dob)} />
                                {errors.dob && <p style={errorStyle}>{errors.dob}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Age</label>
                                <input value={formData.age} readOnly disabled placeholder="Auto-calculated"
                                    style={{ ...inputStyle(false), background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                                <input ref={phoneInputRef} name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+91 XXXXXXXXXX" type="tel" style={inputStyle(errors.phone_number)} />
                                {errors.phone_number && <p style={errorStyle}>{errors.phone_number}</p>}

                                <div aria-live="polite" style={{ marginTop: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            padding: '3px 10px',
                                            borderRadius: 999,
                                            border: `1px solid ${isPhoneVerified ? '#86efac' : '#fecaca'}`,
                                            background: isPhoneVerified ? '#d1fae5' : '#fef2f2',
                                            color: isPhoneVerified ? '#065f46' : '#991b1b',
                                        }}>
                                            {isPhoneVerified ? 'Verified' : 'Not verified'}
                                        </span>

                                        {isPhoneVerified ? (
                                            <button
                                                type="button"
                                                onClick={() => phoneInputRef.current?.focus()}
                                                style={{
                                                    marginLeft: 'auto',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#059669',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                Change number
                                            </button>
                                        ) : (
                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {!otpSent ? (
                                                    <button
                                                        type="button"
                                                        className="tp-btn"
                                                        onClick={handleSendOtp}
                                                        disabled={!currentPhoneE164 || otpSending}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: 9,
                                                            border: '1px solid #059669',
                                                            background: otpSending ? '#d1fae5' : '#059669',
                                                            fontSize: 13,
                                                            fontWeight: 800,
                                                            color: otpSending ? '#065f46' : '#fff',
                                                            cursor: (!currentPhoneE164 || otpSending) ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {otpSending ? 'Sending…' : 'Send OTP'}
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
                                                        <span style={{ fontSize: 11, color: '#6b7280' }}>
                                                            {otpPhoneDisplay ? `Sent to ${otpPhoneDisplay}` : 'OTP sent to WhatsApp'}
                                                        </span>
                                                        {resendCooldown > 0 ? (
                                                            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                                Resend available in {resendCooldown}s
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={handleSendOtp}
                                                                disabled={!currentPhoneE164 || otpSending}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    marginTop: 2,
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    color: '#059669',
                                                                    cursor: (!currentPhoneE164 || otpSending) ? 'not-allowed' : 'pointer',
                                                                    textDecoration: 'underline',
                                                                }}
                                                            >
                                                                Resend OTP
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {otpSent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setOtpModalOpen(true)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: 0,
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            color: '#111827',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                        }}
                                                    >
                                                        Enter OTP
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {!otpModalOpen && otpError && <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>{otpError}</div>}
                                    {!otpModalOpen && otpMessage && !otpError && <div style={{ marginTop: 8, fontSize: 12, color: '#065f46' }}>{otpMessage}</div>}
                                    {import.meta.env.DEV && devOtp && !otpModalOpen && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                                            DEV OTP: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{devOtp}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Address Details</h2>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Address Line 1 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input ref={address1Ref} name="address_line1" value={formData.address_line1} onChange={handleChange} placeholder="Street address, building" style={inputStyle(errors.address_line1)} />
                            {errors.address_line1 && <p style={errorStyle}>{errors.address_line1}</p>}
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Address Line 2</label>
                            <input name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder="Apartment, suite, unit (optional)" style={inputStyle(false)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>City <span style={{ color: '#ef4444' }}>*</span></label>
                                <input ref={cityRef} name="city" value={formData.city} onChange={handleChange} placeholder="Enter city" style={inputStyle(errors.city)} />
                                {errors.city && <p style={errorStyle}>{errors.city}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>State <span style={{ color: '#ef4444' }}>*</span></label>
                                <select ref={stateRef} name="state" value={formData.state} onChange={handleChange} style={inputStyle(errors.state)}>
                                    <option value="">Select State</option>
                                    {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.state && <p style={errorStyle}>{errors.state}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Pincode <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    ref={pincodeRef}
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    placeholder="e.g. 560001"
                                    inputMode="numeric"
                                    maxLength={6}
                                    style={inputStyle(errors.pincode || pinLookup.error)}
                                />
                                {errors.pincode && <p style={errorStyle}>{errors.pincode}</p>}
                                {pinLookup.loading && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Looking up city & state…</p>}
                                {!pinLookup.loading && pinLookup.error && <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>{pinLookup.error}</p>}
                                {!pinLookup.loading && !pinLookup.error && pinLookup.autofilled && (
                                    <p style={{ fontSize: 12, color: '#065f46', marginTop: 6 }}>City & state autofilled from pincode.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Practice */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 20px' }}>Practice Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Practice Type</label>
                                <select name="practice_type" value={formData.practice_type} onChange={handleChange} style={inputStyle(false)}>
                                    <option value="Individual">Individual</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Years of Experience</label>
                                <input ref={yearsExpRef} name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} type="number" min="1" placeholder="e.g. 5" style={inputStyle(errors.years_of_experience)} />
                                {errors.years_of_experience && <p style={errorStyle}>{errors.years_of_experience}</p>}
                            </div>
                        </div>
                        {!isDetailsEdit && (
                            <div style={{ marginTop: 16 }}>
                                <label style={labelStyle}>Experience Letter <span style={{ color: '#ef4444' }}></span></label>
                                <FileDropzone
                                    title="Experience letter"
                                    subtitle="Optional • PDF, JPG, PNG • Max 10MB"
                                    helperText={experienceLetter ? '' : 'Drag & drop or click to upload.'}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    files={experienceLetter ? [experienceLetter] : []}
                                    pickerRef={experienceLetterRef}
                                    onFilesSelected={(picked) => setExperienceLetterFromFile(picked?.[0] || null)}
                                    onRemoveAt={() => setExperienceLetter(null)}
                                    error={errors.experience_letter || ''}
                                    disabled={loading}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="tp-btn" type="submit" disabled={loading} style={{
                            padding: '12px 32px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            background: loading ? '#e5e7eb' : '#059669', color: loading ? '#9ca3af' : '#fff',
                            transition: 'background 0.2s'
                        }}>
                            {loading ? 'Submitting...' : 'Submit & Continue →'}
                        </button>
                    </div>
                </form>
            </div>

            {/* OTP Modal (glassmorphism) */}
                                    {otpModalOpen && !isPhoneVerified && createPortal((
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Verify OTP"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setOtpModalOpen(false);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 80,
                        display: 'grid',
                        placeItems: 'center',
                        padding: 16,
                        overflowY: 'auto',
                        background: 'rgba(15, 23, 42, 0.35)',
                        margin: 0,
                    }}
                >
                    <div
                        style={{
                            width: 'min(520px, 100%)',
                            margin: 'auto',
                            maxHeight: 'calc(100vh - 32px)',
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.22)',
                            background: 'rgba(255, 255, 255, 0.18)',
                            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.25)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(5,150,105,0.18)', border: '1px solid rgba(5,150,105,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 900 }}>
                                ✓
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Verify OTP</div>
                                <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.70)' }}>
                                    {otpPhoneDisplay ? `Sent to ${otpPhoneDisplay}` : 'Sent to your WhatsApp number'}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="tp-btn"
                                onClick={() => setOtpModalOpen(false)}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 12,
                                    border: '1px solid rgba(15,23,42,0.12)',
                                    background: 'rgba(255,255,255,0.55)',
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                    fontWeight: 900,
                                }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ padding: 16 }} aria-live="polite">
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div
                                    onPaste={(e) => {
                                        const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                                        if (!text) return;
                                        e.preventDefault();
                                        const next = ['', '', '', '', '', ''];
                                        for (let i = 0; i < text.length; i++) next[i] = text[i];
                                        setOtpDigits(next);
                                        setOtpError('');
                                        setOtpMessage('');
                                        const focusIndex = Math.min(text.length, 5);
                                        setTimeout(() => otpBoxRefs.current[focusIndex]?.focus?.(), 0);
                                    }}
                                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                                >
                                    {otpDigits.map((d, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { otpBoxRefs.current[idx] = el; }}
                                            value={d}
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            aria-label={`OTP digit ${idx + 1}`}
                                            onChange={(e) => {
                                                const v = String(e.target.value || '').replace(/\D/g, '').slice(-1);
                                                const next = [...otpDigits];
                                                next[idx] = v;
                                                setOtpDigits(next);
                                                setOtpError('');
                                                setOtpMessage('');
                                                if (v && idx < 5) otpBoxRefs.current[idx + 1]?.focus?.();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (otpComplete && !otpVerifying) handleVerifyOtp();
                                                    return;
                                                }
                                                if (e.key === 'Backspace') {
                                                    e.preventDefault();
                                                    const next = [...otpDigits];
                                                    if (next[idx]) {
                                                        next[idx] = '';
                                                        setOtpDigits(next);
                                                        return;
                                                    }
                                                    if (idx > 0) {
                                                        next[idx - 1] = '';
                                                        setOtpDigits(next);
                                                        otpBoxRefs.current[idx - 1]?.focus?.();
                                                    }
                                                    return;
                                                }
                                                if (e.key === 'ArrowLeft' && idx > 0) {
                                                    e.preventDefault();
                                                    otpBoxRefs.current[idx - 1]?.focus?.();
                                                }
                                                if (e.key === 'ArrowRight' && idx < 5) {
                                                    e.preventDefault();
                                                    otpBoxRefs.current[idx + 1]?.focus?.();
                                                }
                                            }}
                                            style={{
                                                width: 42,
                                                height: 44,
                                                borderRadius: 12,
                                                fontSize: 16,
                                                fontWeight: 800,
                                                border: otpError ? '1px solid rgba(239, 68, 68, 0.55)' : '1px solid rgba(15,23,42,0.16)',
                                                background: 'rgba(255,255,255,0.60)',
                                                outline: 'none',
                                                textAlign: 'center',
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                            }}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="tp-btn"
                                    onClick={handleVerifyOtp}
                                    disabled={!otpComplete || otpVerifying || !currentPhoneE164}
                                    style={{
                                        padding: '11px 14px',
                                        borderRadius: 12,
                                        border: '1px solid rgba(5,150,105,0.65)',
                                        background: otpVerifying ? 'rgba(209, 250, 229, 0.9)' : 'rgba(5,150,105,0.92)',
                                        color: otpVerifying ? '#065f46' : '#fff',
                                        fontSize: 13,
                                        fontWeight: 900,
                                        cursor: (!otpComplete || otpVerifying || !currentPhoneE164) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {otpVerifying ? 'Verifying…' : 'Verify'}
                                </button>

                                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                                    {resendCooldown > 0 ? (
                                        <span style={{ fontSize: 12, color: 'rgba(15,23,42,0.70)' }}>
                                            Resend in {resendCooldown}s
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={!currentPhoneE164 || otpSending}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: 0,
                                                fontSize: 12,
                                                fontWeight: 800,
                                                color: '#0f172a',
                                                cursor: (!currentPhoneE164 || otpSending) ? 'not-allowed' : 'pointer',
                                                textDecoration: 'underline',
                                            }}
                                        >
                                            {otpSending ? 'Sending…' : 'Resend OTP'}
                                        </button>
                                    )}
                                    <span style={{ fontSize: 11, color: 'rgba(15,23,42,0.55)' }}>WhatsApp OTP</span>
                                </div>
                            </div>

                            {otpError && <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c' }}>{otpError}</div>}
                            {otpMessage && !otpError && <div style={{ marginTop: 10, fontSize: 12, color: '#065f46' }}>{otpMessage}</div>}
                            {import.meta.env.DEV && devOtp && (
                                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(15,23,42,0.65)' }}>
                                    DEV OTP: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{devOtp}</span>
                                </div>
                            )}

                            <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(15,23,42,0.60)' }}>
                                Tip: If you didn’t receive it, check WhatsApp message requests/spam.
                            </div>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default Onboarding;
