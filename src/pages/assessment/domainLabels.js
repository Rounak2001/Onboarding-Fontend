export const normalizeAssessmentDomainLabel = (label) => {
    const raw = String(label || '').trim();
    const normalized = raw.toLowerCase();

    if (!normalized) {
        return raw;
    }

    const labelMap = {
        gst: 'GST',
        tds: 'TDS',
        'income tax': 'Income Tax',
        'income-tax': 'Income Tax',
        income_tax: 'Income Tax',
        scrutiny: 'Scrutiny',
        'professional tax': 'Scrutiny',
        'professional-tax': 'Scrutiny',
        professional_tax: 'Scrutiny',
        'profession-tax': 'Scrutiny',
    };

    return labelMap[normalized] || raw;
};
