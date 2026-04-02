import {
    ASSESSMENT_CATEGORIES,
    normalizeAssessmentCategoryKey,
} from './assessmentCatalog';

const STORAGE_PREFIX = 'taxplan.assessment';
const SELECTION_MATRIX_KEY = `${STORAGE_PREFIX}.selectionMatrix.v1`;
const SELECTED_TESTS_KEY = `${STORAGE_PREFIX}.selectedTests.v1`;

const CATEGORY_SERVICE_ORDER = Object.fromEntries(
    ASSESSMENT_CATEGORIES.map((category) => [
        category.slug,
        category.services.map((service) => service.id),
    ])
);

const CATEGORY_SERVICE_LOOKUP = Object.fromEntries(
    ASSESSMENT_CATEGORIES.map((category) => [
        category.slug,
        new Set(category.services.map((service) => service.id)),
    ])
);

export const createEmptySelectionMatrix = () => Object.fromEntries(
    ASSESSMENT_CATEGORIES.map((category) => [category.slug, []])
);

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readJson = (key) => {
    if (!canUseStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const writeJson = (key, value) => {
    if (!canUseStorage()) {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage quota and private-mode failures.
    }
};

const sortServiceIds = (categorySlug, serviceIds) => {
    const order = CATEGORY_SERVICE_ORDER[categorySlug] || [];
    const lookup = new Set(Array.isArray(serviceIds) ? serviceIds : []);
    return order.filter((serviceId) => lookup.has(serviceId));
};

const sanitizeServiceIds = (categorySlug, rawServiceIds) => {
    const allowedIds = CATEGORY_SERVICE_LOOKUP[categorySlug];
    if (!allowedIds || !Array.isArray(rawServiceIds)) {
        return [];
    }

    const deduped = [];
    const seen = new Set();
    rawServiceIds.forEach((rawValue) => {
        const serviceId = String(rawValue || '').trim();
        if (!serviceId || seen.has(serviceId) || !allowedIds.has(serviceId)) {
            return;
        }
        seen.add(serviceId);
        deduped.push(serviceId);
    });

    return sortServiceIds(categorySlug, deduped);
};

export const sanitizeSelectionMatrix = (rawMatrix) => {
    const normalized = createEmptySelectionMatrix();
    if (!rawMatrix || typeof rawMatrix !== 'object') {
        return normalized;
    }

    Object.entries(rawMatrix).forEach(([rawCategoryKey, rawServiceIds]) => {
        const categorySlug = normalizeAssessmentCategoryKey(rawCategoryKey);
        if (!categorySlug || !(categorySlug in normalized)) {
            return;
        }
        normalized[categorySlug] = sanitizeServiceIds(categorySlug, rawServiceIds);
    });

    return normalized;
};

export const sanitizeSelectedTests = (rawSelectedTests) => {
    if (!Array.isArray(rawSelectedTests)) {
        return [];
    }

    const bySlug = new Map();
    rawSelectedTests.forEach((item) => {
        const categorySlug = normalizeAssessmentCategoryKey(
            item?.slug
            || item?.name
            || item?.id
            || item?.category?.slug
            || item?.category?.name
        );
        if (!categorySlug || !CATEGORY_SERVICE_LOOKUP[categorySlug]) {
            return;
        }

        const selectedServiceIds = sanitizeServiceIds(
            categorySlug,
            item?.selectedServiceIds
        );

        if (selectedServiceIds.length === 0) {
            return;
        }

        const existing = bySlug.get(categorySlug);
        if (!existing || selectedServiceIds.length >= existing.selectedServiceIds.length) {
            bySlug.set(categorySlug, {
                id: categorySlug,
                slug: categorySlug,
                name: ASSESSMENT_CATEGORIES.find((category) => category.slug === categorySlug)?.name || categorySlug,
                selectedServiceIds,
            });
        }
    });

    return ASSESSMENT_CATEGORIES
        .map((category) => bySlug.get(category.slug))
        .filter(Boolean);
};

export const selectionMatrixFromSelectedTests = (selectedTests) => {
    const normalized = createEmptySelectionMatrix();
    sanitizeSelectedTests(selectedTests).forEach((test) => {
        normalized[test.slug] = sanitizeServiceIds(test.slug, test.selectedServiceIds);
    });
    return normalized;
};

export const selectedTestsFromSelectionMatrix = (selectionMatrix, visibleCategorySlugs = null) => {
    const normalizedMatrix = sanitizeSelectionMatrix(selectionMatrix);
    const visibleLookup = Array.isArray(visibleCategorySlugs) && visibleCategorySlugs.length > 0
        ? new Set(visibleCategorySlugs.map((slug) => normalizeAssessmentCategoryKey(slug)))
        : null;

    return ASSESSMENT_CATEGORIES
        .filter((category) => !visibleLookup || visibleLookup.has(category.slug))
        .map((category) => {
            const selectedServiceIds = normalizedMatrix[category.slug] || [];
            if (selectedServiceIds.length === 0) {
                return null;
            }
            return {
                id: category.slug,
                slug: category.slug,
                name: category.name,
                selectedServiceIds,
            };
        })
        .filter(Boolean);
};

export const loadSelectionMatrix = () => sanitizeSelectionMatrix(readJson(SELECTION_MATRIX_KEY));
export const saveSelectionMatrix = (selectionMatrix) => {
    writeJson(SELECTION_MATRIX_KEY, sanitizeSelectionMatrix(selectionMatrix));
};
export const clearSelectionMatrix = () => {
    if (!canUseStorage()) return;
    try {
        window.localStorage.removeItem(SELECTION_MATRIX_KEY);
    } catch {
        // Ignore storage failures.
    }
};

export const loadSelectedTests = () => sanitizeSelectedTests(readJson(SELECTED_TESTS_KEY));
export const saveSelectedTests = (selectedTests) => {
    writeJson(SELECTED_TESTS_KEY, sanitizeSelectedTests(selectedTests));
};
export const clearSelectedTests = () => {
    if (!canUseStorage()) return;
    try {
        window.localStorage.removeItem(SELECTED_TESTS_KEY);
    } catch {
        // Ignore storage failures.
    }
};
