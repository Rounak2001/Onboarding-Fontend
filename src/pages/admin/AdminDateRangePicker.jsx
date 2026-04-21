import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';

const AdminDateRangePicker = ({ onChange, value, isLight }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const containerRef = useRef(null);

    const options = [
        { label: 'All Time', value: 'all' },
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'This Week', value: 'this_week' },
        { label: 'Last Week', value: 'last_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Last Month', value: 'last_month' },
        { label: 'Custom', value: 'custom' },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOption = (opt) => {
        if (opt.value === 'custom') {
            setIsCalendarOpen(true);
        } else {
            onChange(opt.value);
            setIsOpen(false);
        }
    };

    const activeOption = options.find(o => o.value === value) || options[0];

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '220px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'var(--admin-surface-strong)',
                    border: '1px solid var(--admin-border-mid)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--admin-text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: isLight ? '0 4px 12px rgba(148,163,184,0.08)' : 'none',
                    outline: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} color="#3b82f6" />
                    <span>{activeOption.label}</span>
                </div>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--admin-surface-strong)',
                    border: '1px solid var(--admin-border-mid)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                    padding: '8px',
                }}>
                    {!isCalendarOpen ? (
                        options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelectOption(opt)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: value === opt.value ? (isLight ? '#f1f5f9' : 'rgba(59,130,246,0.1)') : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    color: value === opt.value ? '#3b82f6' : 'var(--admin-text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: value === opt.value ? '700' : '500',
                                    textAlign: 'left',
                                    transition: '0.2s',
                                }}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={14} />}
                            </button>
                        ))
                    ) : (
                        <div style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>Custom Range</span>
                                <button onClick={() => setIsCalendarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                                    <X size={16} />
                                </button>
                            </div>
                            {/* Dummy Calendar for Demo - In a real app we'd use a date picker lib here */}
                            <div style={{ padding: 10, background: 'var(--admin-surface)', borderRadius: 12, border: '1px solid var(--admin-border-soft)', textAlign: 'center' }}>
                                <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 12 }}>April 2026</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 10, color: 'var(--admin-text-muted)' }}>
                                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
                                    {Array.from({ length: 30 }).map((_, i) => (
                                        <div key={i} style={{ 
                                            padding: '6px', 
                                            background: (i+1 >= 10 && i+1 <= 12) ? '#3b82f6' : 'transparent',
                                            color: (i+1 >= 10 && i+1 <= 12) ? '#fff' : 'var(--admin-text-secondary)',
                                            borderRadius: '50%',
                                            cursor: 'pointer'
                                        }}>
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={() => { onChange('custom'); setIsOpen(false); setIsCalendarOpen(false); }}
                                style={{ width: '100%', marginTop: 12, padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                            >
                                Apply Range
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDateRangePicker;
