import { useMemo, useRef, useState } from 'react';

const formatBytes = (bytes) => {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const val = n / (1024 ** idx);
    return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const FileDropzone = ({
    title,
    subtitle,
    accept = '',
    multiple = false,
    disabled = false,
    error = '',
    files = [],
    maxFiles = null,
    pickerRef = null,
    onFilesSelected,
    onRemoveAt,
    helperText = '',
}) => {
    const internalInputRef = useRef(null);
    const inputRef = pickerRef || internalInputRef;
    const [isDragging, setIsDragging] = useState(false);
    const [justDropped, setJustDropped] = useState(false);

    const canAddMore = useMemo(() => {
        if (!multiple) return files.length === 0;
        if (maxFiles == null) return true;
        return files.length < maxFiles;
    }, [files.length, maxFiles, multiple]);

    const openPicker = () => {
        if (disabled || !canAddMore) return;
        inputRef.current?.click?.();
    };

    const deliverFiles = (incoming) => {
        if (disabled) return;
        const list = Array.from(incoming || []).filter(Boolean);
        if (list.length === 0) return;
        const next = multiple ? list : [list[0]];
        onFilesSelected?.(next, { source: 'dropzone' });
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled || !canAddMore) return;
        deliverFiles(e.dataTransfer?.files);
        setJustDropped(true);
        window.setTimeout(() => setJustDropped(false), 220);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        if (disabled || !canAddMore) return;
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        // If leaving to a child element, ignore.
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const hasFiles = files.length > 0;
    const showError = Boolean(error);

    const borderColor = showError
        ? '#fca5a5'
        : (isDragging ? '#3b82f6' : (hasFiles ? '#059669' : '#d1d5db'));
    const background = showError
        ? '#fef2f2'
        : (isDragging ? 'rgba(59,130,246,0.06)' : (hasFiles ? '#f0fdf4' : '#ffffff'));

    return (
        <div>
            <style>{`
                @keyframes dzPop { from { transform: scale(0.995); } to { transform: scale(1); } }
            `}</style>
            <div
                role="button"
                tabIndex={0}
                onClick={openPicker}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragOver}
                onDragLeave={onDragLeave}
                style={{
                    border: `2px ${hasFiles ? 'solid' : 'dashed'} ${borderColor}`,
                    borderRadius: 12,
                    padding: hasFiles ? '14px 16px' : '26px 18px',
                    cursor: (disabled || !canAddMore) ? 'not-allowed' : 'pointer',
                    background,
                    outline: 'none',
                    transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease, box-shadow 160ms ease',
                    transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                    boxShadow: isDragging ? '0 10px 24px rgba(59,130,246,0.12)' : 'none',
                    animation: justDropped ? 'dzPop 180ms ease-out' : 'none',
                    userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: hasFiles ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        {title && (
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: hasFiles ? 2 : 6 }}>
                                {title}
                            </div>
                        )}
                        {subtitle && (
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: hasFiles ? 10 : 0 }}>
                                {subtitle}
                            </div>
                        )}

                        {!hasFiles && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontSize: 24, lineHeight: 1 }}>{isDragging ? '📥' : '📄'}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'center' }}>
                                    {isDragging ? 'Drop file(s) here' : (multiple ? 'Click or drag & drop files' : 'Click or drag & drop a file')}
                                </div>
                                {helperText && (
                                    <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{helperText}</div>
                                )}
                                {(!disabled && !canAddMore) && (
                                    <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                                        Max files reached
                                    </div>
                                )}
                            </div>
                        )}

                        {hasFiles && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {files.map((f, idx) => (
                                    <div key={`${f?.name || 'file'}-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        background: 'rgba(15,23,42,0.02)',
                                        border: '1px solid rgba(15,23,42,0.08)',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: 12, fontWeight: 900, flexShrink: 0,
                                            }}>
                                                ✓
                                            </span>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {f?.name || 'Selected file'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    {formatBytes(f?.size)}
                                                </div>
                                            </div>
                                        </div>
                                        {typeof onRemoveAt === 'function' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onRemoveAt(idx); }}
                                                style={{
                                                    border: 'none',
                                                    background: 'rgba(239,68,68,0.08)',
                                                    color: '#ef4444',
                                                    fontWeight: 800,
                                                    borderRadius: 10,
                                                    padding: '8px 10px',
                                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                                    transition: 'transform 120ms ease, background 120ms ease',
                                                }}
                                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                disabled={disabled}
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {multiple && canAddMore && !disabled && (
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        Drop more files here, or click to add more.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!hasFiles && (
                        <div style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: isDragging ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isDragging ? '#2563eb' : '#64748b',
                            flexShrink: 0,
                            transition: 'background 160ms ease, color 160ms ease, transform 160ms ease',
                            transform: isDragging ? 'rotate(-3deg) scale(1.03)' : 'none',
                        }}>
                            ⤓
                        </div>
                    )}
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => {
                    deliverFiles(e.target.files);
                    // allow re-selecting the same file
                    e.target.value = '';
                }}
                style={{ display: 'none' }}
                disabled={disabled || !canAddMore}
            />

            {showError && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626' }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileDropzone;
