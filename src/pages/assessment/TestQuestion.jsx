import { useMemo } from 'react';

const hashSeed = (str) => {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
    };
};

const mulberry32 = (a) => () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seededShuffle = (arr, seedStr) => {
    const seedGen = hashSeed(seedStr);
    const rand = mulberry32(seedGen());
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default function TestQuestion({ question, selectedAnswer, onSelectAnswer, questionIndex, totalQuestions }) {

    const optionEntries = useMemo(() => {
        const entries = question?.options ? Object.entries(question.options) : [];
        if (entries.length <= 1) return entries;

        // Only jumble options in production. In dev, keep the exact backend order for easier testing/debug.
        if (import.meta.env.PROD) {
            const seed = String(question?.id ?? question?.question ?? 'seed');
            return seededShuffle(entries, seed);
        }

        return entries;
    }, [question?.id, question?.question, question?.options]);

    return (
        <div>
            {/* Question header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{
                    fontSize: 12, fontWeight: 700, color: '#059669', background: '#ecfdf5',
                    padding: '5px 14px', borderRadius: 20,
                }}>
                    Q{questionIndex + 1} / {totalQuestions}
                </span>
                {question.domain && (
                    <span style={{
                        fontSize: 12, fontWeight: 600, color: '#6366f1', background: '#eef2ff',
                        padding: '5px 14px', borderRadius: 20,
                    }}>
                        {question.domain}
                    </span>
                )}
            </div>

            {/* Question text */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.5, marginBottom: 28, margin: '0 0 28px' }}>
                {question.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {optionEntries.map(([key, value]) => {
                    const isSelected = selectedAnswer === key;
                    return (
                        <button
                            className="tp-btn"
                            key={key}
                            onClick={() => onSelectAnswer(key)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px 20px', borderRadius: 12, textAlign: 'left',
                                border: isSelected ? '2px solid #059669' : '2px solid #e5e7eb',
                                background: isSelected ? '#f0fdf4' : '#fff',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700,
                                background: isSelected ? '#059669' : '#f3f4f6',
                                color: isSelected ? '#fff' : '#6b7280',
                            }}>
                                {isSelected ? '✓' : key}
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 500, color: isSelected ? '#111827' : '#374151', lineHeight: 1.5 }}>
                                {value}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
