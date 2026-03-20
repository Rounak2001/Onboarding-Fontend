const CATEGORY_ALIAS_MAP = {
    itr: 'itr',
    'income-tax': 'itr',
    tds: 'itr',
    gstr: 'gstr',
    gst: 'gstr',
    scrutiny: 'scrutiny',
    'professional-tax': 'scrutiny',
    'profession-tax': 'scrutiny',
    registration: 'registrations',
    registrations: 'registrations',
};

const createService = (id, label, group, section = group) => ({
    id,
    label,
    group,
    section,
});

export const REGISTRATIONS_CATEGORY_SLUG = 'registrations';

export const ASSESSMENT_CATEGORIES = [
    {
        slug: 'itr',
        name: 'ITR',
        token: 'ITR',
        accent: '#0f766e',
        accentSoft: '#ecfdf5',
        border: '#99f6e4',
        description: 'Income-tax return work, TDS workflows, and related consultation.',
        coverageSummary: ['7 ITR services', '4 TDS services', '1 consultation'],
        services: [
            createService('itr_salary_filing', 'ITR Salary Filing', 'ITR'),
            createService('itr_individual_business_filing', 'ITR Individual Business Filing', 'ITR'),
            createService('itr_llp_filing', 'ITR LLP Filing', 'ITR'),
            createService('itr_nri_filing', 'ITR NRI Filing', 'ITR'),
            createService('itr_partnership_filing', 'ITR Partnership Filing', 'ITR'),
            createService('itr_company_filing', 'ITR Company Filing', 'ITR'),
            createService('itr_trust_filing', 'ITR Trust Filing', 'ITR'),
            createService('tds_monthly_payment', 'TDS Monthly Payment', 'TDS'),
            createService('tds_quarterly_filing', 'TDS Quarterly Filing', 'TDS'),
            createService('tds_revised_quarterly_filing', 'TDS Revised Quarterly Filing', 'TDS'),
            createService('tds_sale_of_property_26qb', 'Sale of Property (26QB)', 'TDS'),
            createService('itr_general_consultation', 'General ITR Consultation', 'Consultation'),
        ],
    },
    {
        slug: 'gstr',
        name: 'GSTR',
        token: 'GST',
        accent: '#1d4ed8',
        accentSoft: '#eff6ff',
        border: '#bfdbfe',
        description: 'GST return operations, periodic filings, and related consultation.',
        coverageSummary: ['7 GSTR services', '1 consultation'],
        services: [
            createService('gstr_monthly', 'GSTR-1 & GSTR-3B (Monthly)', 'GSTR'),
            createService('gstr_quarterly', 'GSTR-1 & GSTR-3B (Quarterly)', 'GSTR'),
            createService('gstr_cmp_08', 'GSTR CMP-08', 'GSTR'),
            createService('gstr_9', 'GSTR-9', 'GSTR'),
            createService('gstr_9c', 'GSTR-9C', 'GSTR'),
            createService('gstr_4', 'GSTR-4 (Annual Return)', 'GSTR'),
            createService('gstr_10', 'GSTR-10 (Final Return)', 'GSTR'),
            createService('gstr_general_consultation', 'General GSTR Consultation', 'Consultation'),
        ],
    },
    {
        slug: 'scrutiny',
        name: 'Scrutiny',
        token: 'SCN',
        accent: '#b45309',
        accentSoft: '#fff7ed',
        border: '#fed7aa',
        description: 'Scrutiny and assessment support grouped by income-tax and GST matters.',
        coverageSummary: ['6 Income Tax scrutiny services', '3 GSTR scrutiny services'],
        services: [
            createService('itr_appeal', 'ITR Appeal', 'ITR', 'Income Tax'),
            createService('itr_regular_assessment', 'ITR Regular Assessment', 'ITR', 'Income Tax'),
            createService('itr_tribunal', 'ITR Tribunal', 'ITR', 'Income Tax'),
            createService('tds_appeal', 'TDS Appeal', 'TDS', 'Income Tax'),
            createService('tds_regular_assessment', 'TDS Regular Assessment', 'TDS', 'Income Tax'),
            createService('tds_tribunal', 'TDS Tribunal', 'TDS', 'Income Tax'),
            createService('gst_appeal', 'GST Appeal', 'GSTR', 'GSTR'),
            createService('gst_regular_assessment', 'GST Regular Assessment', 'GSTR', 'GSTR'),
            createService('gst_tribunal', 'GST Tribunal', 'GSTR', 'GSTR'),
        ],
    },
    {
        slug: REGISTRATIONS_CATEGORY_SLUG,
        name: 'Registrations',
        token: 'REG',
        accent: '#be123c',
        accentSoft: '#fff1f2',
        border: '#fecdd3',
        description: 'Core registration workflows unlocked after you choose at least one main category first.',
        coverageSummary: ['16 registration services'],
        requiresPriorSelection: true,
        services: [
            createService('pan_application', 'PAN Application', 'Registration Services'),
            createService('tan_registration', 'TAN Registration', 'Registration Services'),
            createService('aadhaar_validation', 'Aadhaar Validation', 'Registration Services'),
            createService('msme_registration', 'MSME Registration', 'Registration Services'),
            createService('iec', 'Import Export Code (IEC)', 'Registration Services'),
            createService('partnership_firm_registration', 'Partnership Firm Registration', 'Registration Services'),
            createService('llp_registration', 'LLP Registration', 'Registration Services'),
            createService('pvt_ltd_registration', 'Private Limited Company Registration', 'Registration Services'),
            createService('startup_india_registration', 'Startup India Registration', 'Registration Services'),
            createService('trust_formation', 'Trust Formation', 'Registration Services'),
            createService('reg_12a', '12A Registration', 'Registration Services'),
            createService('reg_80g', '80G Registration', 'Registration Services'),
            createService('dsc', 'DSC (Digital Signature Certificate)', 'Registration Services'),
            createService('huf_pan', 'HUF PAN', 'Registration Services'),
            createService('nri_pan', 'NRI PAN', 'Registration Services'),
            createService('foreign_entity_registration', 'Foreign Entity Registration', 'Registration Services'),
        ],
    },
];

export const ASSESSMENT_CATEGORY_ORDER = ASSESSMENT_CATEGORIES.map((category) => category.slug);

export const ASSESSMENT_CATEGORY_MAP = Object.fromEntries(
    ASSESSMENT_CATEGORIES.map((category) => [category.slug, category])
);

export const normalizeAssessmentCategoryKey = (value) => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-');

    if (!normalized) {
        return '';
    }

    return CATEGORY_ALIAS_MAP[normalized] || normalized;
};

export const getAssessmentCategory = (value) => {
    const slug = normalizeAssessmentCategoryKey(value);
    return ASSESSMENT_CATEGORY_MAP[slug] || null;
};

export const getCategoryServicesByIds = (value, selectedIds = []) => {
    const category = typeof value === 'string' ? getAssessmentCategory(value) : value;
    if (!category) {
        return [];
    }

    const selectedLookup = new Set(selectedIds);
    return category.services.filter((service) => selectedLookup.has(service.id));
};

export const getAssessmentServiceSections = (value) => {
    const category = typeof value === 'string' ? getAssessmentCategory(value) : value;
    if (!category) {
        return [];
    }

    const sections = [];
    category.services.forEach((service) => {
        const sectionTitle = service.section || service.group || 'Services';
        let section = sections.find((item) => item.title === sectionTitle);
        if (!section) {
            section = {
                title: sectionTitle,
                services: [],
            };
            sections.push(section);
        }
        section.services.push(service);
    });

    return sections;
};

export const summarizeSelectedServices = (value, selectedIds = [], limit = 3) => {
    const selectedServices = getCategoryServicesByIds(value, selectedIds);
    const preview = selectedServices.slice(0, limit).map((service) => service.label);
    const remainingCount = Math.max(0, selectedServices.length - preview.length);

    return {
        selectedServices,
        preview,
        remainingCount,
        previewText: preview.join(', '),
    };
};
