import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import BrandLogo from '../../components/BrandLogo';

const PreFlightCheck = ({ onComplete, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(10);
    const [checks, setChecks] = useState({
        browser: 'pending',
        webcam: 'pending',
        mic: 'pending',
        network: 'pending',
    });
    const [errorMsg, setErrorMsg] = useState('');

    const webcamRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        
        const runChecks = async () => {
            // 1. Browser Check
            const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.indexedDB);
            setChecks(c => ({ ...c, browser: isSupported ? 'passed' : 'failed' }));
            if (!isSupported) {
                setErrorMsg('Your browser is not supported. Please use recent versions of Chrome, Edge, or Firefox.');
                return;
            }

            // 2. Microphone Check
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                stream.getTracks().forEach(t => t.stop());
                if (mounted) setChecks(c => ({ ...c, mic: 'passed' }));
            } catch (err) {
                if (mounted) {
                    setChecks(c => ({ ...c, mic: 'failed' }));
                    setErrorMsg('Microphone access denied or unavailable. You must allow microphone access to proceed.');
                }
                return;
            }

            // 3. Network Check (Simulate ping/speed)
            try {
                const start = Date.now();
                await fetch('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js', { mode: 'no-cors' });
                const end = Date.now();
                if (end - start > 5000) {
                    if (mounted) {
                        setChecks(c => ({ ...c, network: 'failed' }));
                        setErrorMsg('Your network connection is too slow to reliably upload videos and answers.');
                    }
                    return;
                }
                if (mounted) setChecks(c => ({ ...c, network: 'passed' }));
            } catch (err) {
                if (mounted) {
                    setChecks(c => ({ ...c, network: 'failed' }));
                    setErrorMsg('Network check failed. Please ensure you have a stable internet connection.');
                }
                return;
            }
        };

        runChecks();

        return () => { mounted = false; };
    }, []);

    // 4. Webcam is checked implicitly by the <Webcam> component's onUserMedia callback
    const handleWebcamSuccess = () => {
        setChecks(c => ({ ...c, webcam: 'passed' }));
    };

    const handleWebcamError = () => {
        setChecks(c => ({ ...c, webcam: 'failed' }));
        if (!errorMsg) setErrorMsg('Webcam access denied or unavailable. You must allow camera access to proceed.');
    };

    // Countdown Timer only runs if all checks are passed
    useEffect(() => {
        const allPassed = checks.browser === 'passed' && checks.mic === 'passed' && checks.network === 'passed' && checks.webcam === 'passed';
        const hasFailed = Object.values(checks).includes('failed');

        if (allPassed && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(l => l - 1), 1000);
            return () => clearTimeout(timer);
        } else if (allPassed && timeLeft <= 0) {
            onComplete();
        }
    }, [checks, timeLeft, onComplete]);

    const isFailed = Object.values(checks).includes('failed');

    return (
        <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6 text-[#1A202C]">
            <div className="absolute top-6 left-6">
                <BrandLogo />
            </div>

            <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-600">
                        System Pre-flight Check
                    </h2>
                    <p className="mt-2 text-gray-500 text-lg">
                        Ensuring your system is perfectly ready for the assessment.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <CheckRow label="Browser Compatibility" status={checks.browser} />
                    <CheckRow label="Network Stability" status={checks.network} />
                    <CheckRow label="Microphone Access" status={checks.mic} />
                    <CheckRow label="Webcam Access" status={checks.webcam} />
                </div>

                {isFailed && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isFailed && checks.webcam === 'pending' && (
                    <div className="w-0 h-0 overflow-hidden opacity-0">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            onUserMedia={handleWebcamSuccess}
                            onUserMediaError={handleWebcamError}
                        />
                    </div>
                )}

                {/* Only visually show the webcam once it connects to avoid flickering */}
                {!isFailed && checks.webcam === 'passed' && (
                    <div className="relative w-full h-48 bg-gray-900 rounded-xl overflow-hidden mb-8 shadow-inner border border-gray-200">
                        <Webcam
                            audio={false}
                            className="w-full h-full object-cover"
                            mirrored={true}
                        />
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            Live
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center space-x-4">
                        {!isFailed && (
                            <div className="text-sm text-gray-500 font-medium">
                                Starting in <span className="text-emerald-600 font-bold text-lg w-6 inline-block text-center">{timeLeft}</span>s
                            </div>
                        )}
                        <button
                            disabled={isFailed || timeLeft > 0}
                            onClick={onComplete}
                            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md ${
                                isFailed 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : timeLeft > 0 
                                    ? 'bg-teal-100 text-teal-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                        >
                            Start Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckRow = ({ label, status }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">{label}</span>
            <div className="flex items-center">
                {status === 'pending' && (
                    <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {status === 'passed' && (
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-bold">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Passed
                    </div>
                )}
                {status === 'failed' && (
                    <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-bold">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Failed
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreFlightCheck;
