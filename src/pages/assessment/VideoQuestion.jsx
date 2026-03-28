import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { normalizeAssessmentDomainLabel } from './domainLabels';

const TOTAL_TIME = 90; // 1 min 30 sec

export default function VideoQuestion({
    question,
    onVideoUploaded,
    questionIndex,
    totalVideoQuestions,
    registerSnapshotGetter,
    timeLeft = TOTAL_TIME,
    totalTime = TOTAL_TIME,
}) {
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const autoSubmitRef = useRef(false);
    const timeExpiryHandledRef = useRef(false);

    const [recording, setRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploaded, setUploaded] = useState(false);
    const [error, setError] = useState('');
    const [hasStartedRecording, setHasStartedRecording] = useState(false);
    const categoryLabel = useMemo(() => {
        const raw = String(question?.category || '').trim();
        if (raw) return raw;
        if (question?.type === 'introduction') return 'Introduction';
        return normalizeAssessmentDomainLabel(question?.domain);
    }, [question?.category, question?.domain, question?.type]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    }, []);

    useEffect(() => {
        timeExpiryHandledRef.current = false;
        autoSubmitRef.current = false;
        setRecording(false);
        setRecordedBlob(null);
        setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setUploaded(false);
        setError('');
        setHasStartedRecording(false);
        chunksRef.current = [];
    }, [question?.id]);

    const handleQueueAndAdvance = useCallback((blob) => {
        const uploadBlob = blob || recordedBlob;
        if (!uploadBlob) return;

        setError('');
        setUploaded(true);

        setTimeout(() => {
            onVideoUploaded && onVideoUploaded({
                questionId: question.id,
                questionText: question.question || question.text || '',
                blob: uploadBlob,
                fileName: `video_${question.id}.webm`,
            });
        }, 250);
    }, [recordedBlob, onVideoUploaded, question.id, question.question, question.text]);

    useEffect(() => {
        if (timeLeft > 0 || timeExpiryHandledRef.current) return;
        timeExpiryHandledRef.current = true;

        if (hasStartedRecording && recording) {
            autoSubmitRef.current = true;
            setTimeout(() => stopRecording(), 0);
        } else if (!hasStartedRecording) {
            onVideoUploaded && onVideoUploaded();
        }
    }, [timeLeft, hasStartedRecording, recording, stopRecording, onVideoUploaded]);

    useEffect(() => {
        if (autoSubmitRef.current && recordedBlob && !uploaded) {
            autoSubmitRef.current = false;
            setTimeout(() => handleQueueAndAdvance(recordedBlob), 0);
        }
    }, [recordedBlob, uploaded, handleQueueAndAdvance]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    useEffect(() => {
        if (typeof registerSnapshotGetter === 'function') {
            registerSnapshotGetter(() => webcamRef.current?.getScreenshot?.() || null);
            return () => registerSnapshotGetter(null);
        }
        return undefined;
    }, [registerSnapshotGetter]);

    const startRecording = useCallback(() => {
        chunksRef.current = [];
        setRecordedBlob(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setError('');

        const stream = webcamRef.current?.video?.srcObject;
        if (!stream) {
            setError('Cannot access camera. Please allow camera permissions.');
            return;
        }

        const hasLiveVideoTrack = stream.getVideoTracks().some(
            (track) => track.readyState === 'live' && track.enabled !== false
        );
        const hasLiveAudioTrack = stream.getAudioTracks().some(
            (track) => track.readyState === 'live' && track.enabled !== false
        );

        if (!hasLiveVideoTrack || !hasLiveAudioTrack) {
            setError('Both camera and microphone must be active to record a video answer.');
            return;
        }

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setPreview(URL.createObjectURL(blob));
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        setHasStartedRecording(true);
    }, [preview]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const safeTotalTime = Math.max(1, totalTime || TOTAL_TIME);
    const pct = ((safeTotalTime - Math.max(0, timeLeft)) / safeTotalTime) * 100;
    const isLow = timeLeft < 15;
    const recordingButtonStyle = {
        width: 'clamp(120px, 24%, 170px)',
        maxWidth: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexShrink: 0,
    };

    return (
        <div style={{ position: 'relative' }}>
            {categoryLabel && (
                <span
                    style={{
                        position: 'absolute',
                        top: -6,
                        right: 0,
                        zIndex: 1,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: '#0f766e',
                        background: '#ecfeff',
                        border: '1px solid #99f6e4',
                        borderRadius: 999,
                        padding: '6px 10px',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                    }}
                >
                    {categoryLabel}
                </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '5px 14px', borderRadius: 20 }}>
                        Video {questionIndex + 1} / {totalVideoQuestions}
                    </span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isLow ? '#fef2f2' : '#f9fafb', padding: '6px 14px', borderRadius: 20,
                    border: `1px solid ${isLow ? '#fecaca' : '#e5e7eb'}`,
                }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: isLow ? '#dc2626' : '#111827' }}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.5, margin: '0 0 16px' }}>
                {question.question || question.text}
            </h2>

            <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '16/9', marginBottom: 8 }}>
                {uploaded ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>OK</div>
                        <p style={{ fontWeight: 600, color: '#059669', fontSize: 16 }}>Queued. Moving next...</p>
                    </div>
                ) : preview ? (
                    <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                ) : (
                    <>
                        <Webcam
                            audio={true}
                            muted={true}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            mirrored={true}
                        />
                        {recording && (
                            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
                                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                                    REC
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 1s linear',
                    background: isLow ? '#dc2626' : '#059669',
                    width: `${pct}%`,
                }}></div>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                Video answers require both camera and microphone to be active.
            </p>

            {error && <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#dc2626' }}>{error}</div>}

            {!uploaded && (
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    {!recording && !recordedBlob && timeLeft > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="tp-btn" onClick={startRecording} style={{
                                ...recordingButtonStyle,
                                background: '#059669',
                                color: '#fff',
                            }}>
                                Start Recording
                            </button>
                        </div>
                    )}

                    {recording && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                            <button className="tp-btn" onClick={stopRecording} style={{
                                ...recordingButtonStyle,
                                background: '#dc2626',
                                color: '#fff',
                            }}>
                                Stop Recording
                            </button>
                        </div>
                    )}

                    {recordedBlob && !recording && (
                        <>
                            {timeLeft > 0 && (
                                <button className="tp-btn" onClick={() => { setRecordedBlob(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }} style={{
                                    flex: 1, padding: '14px 0', borderRadius: 10, fontWeight: 500, fontSize: 14,
                                    background: '#fff', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer',
                                }}>
                                    Re-record
                                </button>
                            )}
                            <button className="tp-btn" onClick={() => handleQueueAndAdvance()} style={{
                                flex: 1, padding: '14px 0', borderRadius: 10, fontWeight: 600, fontSize: 14,
                                background: '#059669', color: '#fff', border: 'none', cursor: 'pointer',
                            }}>
                                Submit & Next
                            </button>
                        </>
                    )}

                    {!recording && !recordedBlob && timeLeft === 0 && (
                        <div style={{ textAlign: 'center', width: '100%', padding: 16, color: '#6b7280', fontSize: 14 }}>
                            Time expired. Moving to next question...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
