import { getAssessmentCategory } from './assessmentCatalog';

export const normalizeAssessmentDomainLabel = (label) => {
    const raw = String(label || '').trim();
    if (!raw) {
        return raw;
    }

    const category = getAssessmentCategory(raw);
    return category?.name || raw;
};
