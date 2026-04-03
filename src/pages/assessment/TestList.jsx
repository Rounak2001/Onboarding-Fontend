import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTestTypes, getLatestResult } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import {
    ASSESSMENT_CATEGORIES,
    ASSESSMENT_CATEGORY_MAP,
    getAssessmentServiceSections,
    REGISTRATIONS_CATEGORY_SLUG,
    normalizeAssessmentCategoryKey,
    summarizeSelectedServices,
} from './assessmentCatalog';
import { normalizeAssessmentDomainLabel } from './domainLabels';
import {
    loadSelectionMatrix,
    saveSelectionMatrix,
    saveSelectedTests,
    selectedTestsFromSelectionMatrix,
} from './selectionPersistence';

const sortServiceIds = (category, serviceIds) => {
    const selectedLookup = new Set(serviceIds);
    return category.services
        .filter((service) => selectedLookup.has(service.id))
        .map((service) => service.id);
};

const hasCategorySelection = (selectionMatrix, categorySlug) =>
    Array.isArray(selectionMatrix?.[categorySlug]) && selectionMatrix[categorySlug].length > 0;

const TestList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { stepFlags } = useAuth();
    const [testTypes, setTestTypes] = useState([]);
    const [selectedServiceMatrix, setSelectedServiceMatrix] = useState(() => loadSelectionMatrix());
    const [activeCategorySlug, setActiveCategorySlug] = useState('');
    const [draftSelection, setDraftSelection] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [disqualified, setDisqualified] = useState(false);
    const sessionNotice = String(location.state?.sessionNotice || '').trim();
    const availableCategorySlugs = stepFlags?.available_assessment_categories || [];
    const unlockedCategorySlugs = stepFlags?.unlocked_categories || [];
    const unlockedCategoryLabel = unlockedCategorySlugs
        .map((slug) => normalizeAssessmentDomainLabel(slug))
        .join(', ');
    const isExpansionMode = Boolean(stepFlags?.has_passed_assessment && availableCategorySlugs.length > 0);
    const visibleCategories = useMemo(() => {
        if (!isExpansionMode) {
            return ASSESSMENT_CATEGORIES;
        }
        return ASSESSMENT_CATEGORIES.filter((category) => availableCategorySlugs.includes(category.slug));
    }, [availableCategorySlugs, isExpansionMode]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [types, result] = await Promise.all([
                    getTestTypes(),
                    getLatestResult().catch(() => ({ disqualified: false })),
                ]);

                if (result?.review_pending) {
                    navigate('/assessment/result');
                    return;
                }

                if (result?.passed && !(result?.available_assessment_categories || []).length) {
                    navigate('/success');
                    return;
                }

                setTestTypes(Array.isArray(types) ? types : []);
                setDisqualified(Boolean(result?.disqualified));
                setLoading(false);
            } catch (_err) {
                setError('Failed to load data.');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    useEffect(() => {
        if (!activeCategorySlug) {
            return undefined;
        }

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveCategorySlug('');
                setDraftSelection([]);
            }
        };

        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [activeCategorySlug]);

    const testTypeByCategory = useMemo(() => {
        const lookup = new Map();

        testTypes.forEach((testType) => {
            const slug = normalizeAssessmentCategoryKey(testType?.slug || testType?.name);
            if (!slug || lookup.has(slug)) {
                return;
            }

            lookup.set(slug, {
                ...testType,
                slug,
                name: normalizeAssessmentDomainLabel(testType?.name || slug),
            });
        });

        visibleCategories.forEach((category) => {
            if (!lookup.has(category.slug)) {
                lookup.set(category.slug, {
                    id: category.slug,
                    name: category.name,
                    slug: category.slug,
                });
            }
        });

        return lookup;
    }, [testTypes, visibleCategories]);

    const selectedCategories = useMemo(() => {
        return visibleCategories
            .filter((category) => (selectedServiceMatrix[category.slug] || []).length > 0)
            .map((category) => {
                const selectedServiceIds = selectedServiceMatrix[category.slug] || [];
                const { selectedServices, preview, remainingCount, previewText } =
                    summarizeSelectedServices(category, selectedServiceIds, 3);
                const testType = testTypeByCategory.get(category.slug) || {
                    id: category.slug,
                    name: category.name,
                    slug: category.slug,
                };

                return {
                    ...testType,
                    slug: category.slug,
                    name: category.name,
                    category,
                    selectedServiceIds,
                    selectedServices,
                    selectedServiceCount: selectedServices.length,
                    preview,
                    previewText,
                    remainingCount,
                };
            });
    }, [selectedServiceMatrix, testTypeByCategory, visibleCategories]);

    const hasRegistrationPrerequisite = useMemo(() => {
        if (isExpansionMode) {
            return true;
        }
        return visibleCategories.some((category) => (
            category.slug !== REGISTRATIONS_CATEGORY_SLUG
            && hasCategorySelection(selectedServiceMatrix, category.slug)
        ));
    }, [isExpansionMode, selectedServiceMatrix, visibleCategories]);

    const activeCategory = activeCategorySlug
        ? ASSESSMENT_CATEGORY_MAP[activeCategorySlug] || null
        : null;
    const activeSections = useMemo(
        () => (activeCategory ? getAssessmentServiceSections(activeCategory) : []),
        [activeCategory]
    );

    useEffect(() => {
        if (isExpansionMode) {
            return;
        }

        if (hasRegistrationPrerequisite) {
            return;
        }

        const registrationSelection = selectedServiceMatrix[REGISTRATIONS_CATEGORY_SLUG] || [];
        if (registrationSelection.length > 0) {
            setSelectedServiceMatrix((prev) => {
                if (!hasCategorySelection(prev, REGISTRATIONS_CATEGORY_SLUG)) {
                    return prev;
                }

                return {
                    ...prev,
                    [REGISTRATIONS_CATEGORY_SLUG]: [],
                };
            });
        }

        if (activeCategorySlug === REGISTRATIONS_CATEGORY_SLUG) {
            setActiveCategorySlug('');
            setDraftSelection([]);
        }
    }, [activeCategorySlug, hasRegistrationPrerequisite, isExpansionMode, selectedServiceMatrix]);

    useEffect(() => {
        saveSelectionMatrix(selectedServiceMatrix);
        saveSelectedTests(
            selectedTestsFromSelectionMatrix(
                selectedServiceMatrix,
                visibleCategories.map((category) => category.slug)
            )
        );
    }, [selectedServiceMatrix, visibleCategories]);

    const openCategoryModal = (category) => {
        if (disqualified) {
            return;
        }

        if (!visibleCategories.some((item) => item.slug === category.slug)) {
            return;
        }

        if (category.slug === REGISTRATIONS_CATEGORY_SLUG && !hasRegistrationPrerequisite) {
            return;
        }

        setActiveCategorySlug(category.slug);
        setDraftSelection(selectedServiceMatrix[category.slug] || []);
    };

    const closeCategoryModal = () => {
        setActiveCategorySlug('');
        setDraftSelection([]);
    };

    const handleToggleDraftService = (serviceId) => {
        if (!activeCategory) {
            return;
        }

        setDraftSelection((prev) => {
            const next = prev.includes(serviceId)
                ? prev.filter((currentId) => currentId !== serviceId)
                : [...prev, serviceId];

            return sortServiceIds(activeCategory, next);
        });
    };

    const handleClearSelection = () => {
        if (!activeCategory) {
            return;
        }

        setDraftSelection([]);
        setSelectedServiceMatrix((prev) => ({
            ...prev,
            [activeCategory.slug]: [],
        }));
    };

    const handleSelectAllSection = (sectionServices) => {
        if (!activeCategory) return;
        const sectionIds = sectionServices.map((s) => s.id);
        const allSelected = sectionIds.every((id) => draftSelection.includes(id));

        setDraftSelection((prev) => {
            let next;
            if (allSelected) {
                // Deselect all in this section
                next = prev.filter((id) => !sectionIds.includes(id));
            } else {
                // Add any missing ones
                const toAdd = sectionIds.filter((id) => !prev.includes(id));
                next = [...prev, ...toAdd];
            }
            return sortServiceIds(activeCategory, next);
        });
    };

    const handleApplySelection = () => {
        if (!activeCategory || draftSelection.length === 0) {
            return;
        }

        if (activeCategory.slug === REGISTRATIONS_CATEGORY_SLUG && !hasRegistrationPrerequisite) {
            return;
        }

        setSelectedServiceMatrix((prev) => ({
            ...prev,
            [activeCategory.slug]: sortServiceIds(activeCategory, draftSelection),
        }));
        closeCategoryModal();
    };

    const handleContinue = () => {
        if (selectedCategories.length === 0 || disqualified) {
            return;
        }

        saveSelectedTests(selectedCategories);
        navigate('/assessment/instructions', {
            state: {
                selectedTests: selectedCategories,
            },
        });
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f9fafb',
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 40,
                        border: '3px solid #e5e7eb',
                        borderTopColor: '#059669',
                        borderRadius: '50%',
                        animation: 'tp-spin 1s linear infinite',
                    }}
                />
            </div>
        );
    }

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
                <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <BrandLogo />
                    </div>
                </header>

                <div style={{ maxWidth: 950, margin: '0 auto', padding: '34px 24px 60px' }}>
                <style>{`
                @keyframes tp-spin { to { transform: rotate(360deg); } }
                @keyframes tp-modal-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes tp-modal-rise {
                    from { opacity: 0; transform: translateY(10px) scale(0.985); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .tp-category-grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: 1fr;
                }
                .tp-service-grid {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .tp-assessment-card {
                    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
                }
                .tp-assessment-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                }
                .tp-assessment-card[data-locked='true']:hover {
                    transform: none;
                    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
                }
                .tp-assessment-card:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
                }
                .tp-service-tile {
                    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
                }
                .tp-service-tile:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
                }
                .tp-service-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .tp-modal-backdrop {
                    animation: tp-modal-fade 160ms ease;
                }
                .tp-modal-panel {
                    animation: tp-modal-rise 220ms cubic-bezier(0.2, 0.9, 0.2, 1);
                }
                @media (min-width: 720px) {
                    .tp-category-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .tp-service-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (min-width: 920px) {
                    .tp-service-grid {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }
                }
            `}</style>

                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 16, fontWeight: 700, color: '#047857', marginBottom: 14 }}>
                        {isExpansionMode ? 'Additional Unlock Assessment' : 'Step 4: MCQ'}
                    </span>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>
                        {isExpansionMode ? 'Unlock More Categories' : 'Select Assessment Categories'}
                    </h1>
                    {/* <p style={{ fontSize: 14, lineHeight: 1.65, color: '#64748b', marginTop: 8 }}>
                        {isExpansionMode
                            ? 'Choose one or more locked categories, then confirm the exact titles you want unlocked. Registrations unlock automatically once any main category has been cleared.'
                            : 'Choose one or more categories, then select the exact titles covered inside each popup. The assessment still generates 50 MCQs, split evenly across your confirmed categories.'}
                    </p> */}
                </div>

                {isExpansionMode && (
                    <div
                        style={{
                            borderTop: '1px solid #a7f3d0',
                            borderBottom: '1px solid #a7f3d0',
                            background: '#f4fff9',
                            padding: '14px 0',
                            marginBottom: 20,
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#065f46' }}>
                            Already unlocked: {unlockedCategoryLabel || '—'}.
                            {' '}Registrations are available automatically after your first cleared main-category assessment.
                        </p>
                    </div>
                )}

                {sessionNotice && (
                    <div
                        style={{
                            borderTop: '1px solid #fdba74',
                            borderBottom: '1px solid #fdba74',
                            background: '#fffaf4',
                            padding: '12px 0',
                            marginBottom: 16,
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#9a3412', fontWeight: 600 }}>
                            {sessionNotice}
                        </p>
                    </div>
                )}

                {disqualified && (
                    <div
                        style={{
                            borderTop: '1px solid #fecaca',
                            borderBottom: '1px solid #fecaca',
                            background: '#fff5f5',
                            padding: '16px 0',
                            marginBottom: 24,
                        }}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', margin: '0 0 6px' }}>
                            Assessment Access Revoked
                        </h3>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#b91c1c', margin: 0 }}>
                            You have been disqualified from taking further assessments due to exceeding the
                            maximum number of failed attempts or proctoring violations.
                        </p>
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 12,
                            padding: '12px 16px',
                            fontSize: 14,
                            color: '#dc2626',
                            marginBottom: 18,
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    className="tp-category-grid"
                    style={{
                        marginBottom: 24,
                        opacity: disqualified ? 0.6 : 1,
                        pointerEvents: disqualified ? 'none' : 'auto',
                    }}
                >
                    {visibleCategories.map((category) => {
                        const selectedIds = selectedServiceMatrix[category.slug] || [];
                        const isSelected = selectedIds.length > 0;
                        const isLocked = (
                            category.slug === REGISTRATIONS_CATEGORY_SLUG
                            && !hasRegistrationPrerequisite
                        );
                        const { previewText, remainingCount } = summarizeSelectedServices(category, selectedIds, 3);

                        return (
                            <button
                                className="tp-btn tp-assessment-card"
                                key={category.slug}
                                type="button"
                                onClick={() => openCategoryModal(category)}
                                disabled={disqualified || isLocked}
                                data-locked={isLocked ? 'true' : 'false'}
                                style={{
                                    background: isLocked ? '#f8fafc' : '#ffffff',
                                    borderRadius: 14,
                                    border: isLocked
                                        ? '1px solid #e2e8f0'
                                        : isSelected ? `1px solid ${category.border}` : '1px solid #e5e7eb',
                                    padding: 18,
                                    textAlign: 'left',
                                    cursor: disqualified || isLocked ? 'not-allowed' : 'pointer',
                                    boxShadow: isSelected
                                        ? '0 18px 44px rgba(15, 23, 42, 0.06)'
                                        : '0 8px 24px rgba(15, 23, 42, 0.04)',
                                    opacity: isLocked ? 0.8 : 1,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        marginBottom: 10,
                                    }}
                                >
                                    <span style={{ fontSize: 11, fontWeight: 800, color: isLocked ? '#64748b' : category.accent, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                        {category.token}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: isLocked ? '#64748b' : isSelected ? category.accent : '#64748b',
                                            background: 'transparent',
                                            border: `1px solid ${isLocked ? '#dbe4ef' : isSelected ? category.border : '#e2e8f0'}`,
                                            borderRadius: 999,
                                            padding: '5px 9px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {isLocked ? 'Locked' : isSelected ? `${selectedIds.length} selected` : 'Open selection'}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {category.name}
                                </h3>
                                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b', margin: '8px 0 12px' }}>
                                    {isLocked
                                        ? 'Select a Returns or Notices category first to unlock Registrations.'
                                        : category.description}
                                </p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                    {category.coverageSummary.map((item) => (
                                        <span
                                            key={item}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: '#475569',
                                                background: 'transparent',
                                                border: '1px solid #dbe4ef',
                                                borderRadius: 999,
                                                padding: '4px 9px',
                                            }}
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>

                                {isLocked ? (
                                    <p style={{ fontSize: 13, lineHeight: 1.55, color: '#475569', margin: '0 0 12px' }}>
                                        Registrations stays locked until at least one other category is confirmed.
                                    </p>
                                ) : isSelected ? (
                                    <p style={{ fontSize: 13, lineHeight: 1.55, color: '#0f172a', margin: '0 0 12px', fontWeight: 600 }}>
                                        {previewText}
                                        {remainingCount > 0 ? ` +${remainingCount} more` : ''}
                                    </p>
                                ) : (
                                    <p style={{ fontSize: 13, lineHeight: 1.55, color: '#64748b', margin: '0 0 12px' }}>
                                        Choose the exact titles included in this category before continuing.
                                    </p>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        fontSize: 12,
                                        color: '#64748b',
                                    }}
                                >
                                    <span>{category.services.length} selectable titles</span>
                                    <span style={{ color: isLocked ? '#64748b' : category.accent, fontWeight: 700 }}>
                                        {isLocked ? 'Unlock first' : isSelected ? 'Edit category' : 'Select category'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            {selectedCategories.length === 0
                                ? 'No categories selected'
                                : `${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'} selected`}
                        </span>
                        <span style={{ fontSize: 13, color: '#64748b' }}>
                            {selectedCategories.length === 0
                                ? 'Choose at least one category to continue.'
                                : selectedCategories
                                    .map((category) => `${category.name} (${category.selectedServiceCount})`)
                                    .join('  |  ')}
                        </span>
                    </div>

                    <button
                        className="tp-btn"
                        type="button"
                        onClick={handleContinue}
                        disabled={selectedCategories.length === 0 || disqualified}
                        style={{
                            padding: '12px 30px',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 14,
                            border: 'none',
                            background: selectedCategories.length === 0 || disqualified ? '#e2e8f0' : '#059669',
                            color: selectedCategories.length === 0 || disqualified ? '#94a3b8' : '#ffffff',
                            cursor: selectedCategories.length === 0 || disqualified ? 'not-allowed' : 'pointer',
                            boxShadow: selectedCategories.length === 0 || disqualified
                                ? 'none'
                                : '0 14px 32px rgba(5, 150, 105, 0.22)',
                        }}
                    >
                        Continue
                    </button>
                </div>
                </div>
            </div>

            {activeCategory && typeof document !== 'undefined' && createPortal((
                <div
                    className="tp-modal-backdrop"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.46)',
                        display: 'grid',
                        placeItems: 'center',
                        padding: 24,
                        zIndex: 80,
                    }}
                    onClick={closeCategoryModal}
                >
                    <div
                        className="tp-modal-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`assessment-category-${activeCategory.slug}`}
                        style={{
                            width: 'min(980px, calc(100vw - 48px))',
                            maxHeight: 'calc(100vh - 48px)',
                            background: '#ffffff',
                            borderRadius: 24,
                            border: '1px solid rgba(255,255,255,0.24)',
                            boxShadow: '0 32px 96px rgba(15, 23, 42, 0.26)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            alignSelf: 'center',
                            justifySelf: 'center',
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: '22px 24px 18px',
                                borderBottom: '1px solid #e2e8f0',
                                background: `linear-gradient(180deg, ${activeCategory.accentSoft} 0%, #ffffff 100%)`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                    marginBottom: 14,
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: activeCategory.accent,
                                            background: '#ffffff',
                                            border: `1px solid ${activeCategory.border}`,
                                            borderRadius: 999,
                                            padding: '6px 10px',
                                            marginBottom: 12,
                                        }}
                                    >
                                        {draftSelection.length} selected
                                    </span>
                                    <h2
                                        id={`assessment-category-${activeCategory.slug}`}
                                        style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}
                                    >
                                        {activeCategory.name}
                                    </h2>
                                    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b', margin: '8px 0 0' }}>
                                        Select the titles you want included under this category, then confirm with
                                        Select Category.
                                    </p>
                                </div>

                                <button
                                    className="tp-btn"
                                    type="button"
                                    onClick={closeCategoryModal}
                                    aria-label="Close category popup"
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 12,
                                        border: '1px solid #dbe4ef',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontSize: 20,
                                        lineHeight: 1,
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                    }}
                                >
                                    x
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {activeCategory.coverageSummary.map((item) => (
                                    <span
                                        key={item}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#475569',
                                            background: '#ffffff',
                                            border: '1px solid #dbe4ef',
                                            borderRadius: 999,
                                            padding: '5px 10px',
                                        }}
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: 20, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {activeSections.map((section) => {
                                    const groupCount = new Set(section.services.map((service) => service.group)).size;
                                    const sectionAllSelected = section.services.every((service) => draftSelection.includes(service.id));

                                    return (
                                        <section key={`${activeCategory.slug}-${section.title}`} className="tp-service-section">
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                                    {section.title}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 800,
                                                            color: '#64748b',
                                                            background: '#f8fafc',
                                                            border: '1px solid #dbe4ef',
                                                            borderRadius: 999,
                                                            padding: '5px 9px',
                                                        }}
                                                    >
                                                        {section.services.length} titles
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectAllSection(section.services);
                                                        }}
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            color: sectionAllSelected ? '#334155' : '#ffffff',
                                                            background: sectionAllSelected ? '#e2e8f0' : activeCategory.accent,
                                                            border: sectionAllSelected
                                                                ? '1px solid #cbd5e1'
                                                                : `1px solid ${activeCategory.accent}`,
                                                            cursor: 'pointer',
                                                            padding: '6px 10px',
                                                            borderRadius: 999,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 0.5,
                                                            boxShadow: sectionAllSelected
                                                                ? 'none'
                                                                : `0 4px 12px ${activeCategory.accent}33`,
                                                        }}
                                                    >
                                                        {sectionAllSelected ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="tp-service-grid">
                                                {section.services.map((service) => {
                                                    const isChecked = draftSelection.includes(service.id);
                                                    const showGroupPill = groupCount > 1;

                                                    return (
                                                        <label
                                                            key={service.id}
                                                            className="tp-service-tile"
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 12,
                                                                cursor: 'pointer',
                                                                padding: 14,
                                                                borderRadius: 16,
                                                                border: isChecked
                                                                    ? `1px solid ${activeCategory.border}`
                                                                    : '1px solid #e2e8f0',
                                                                background: isChecked ? activeCategory.accentSoft : '#ffffff',
                                                                minHeight: 96,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    justifyContent: 'space-between',
                                                                    gap: 12,
                                                                }}
                                                            >
                                                                {showGroupPill ? (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 11,
                                                                            fontWeight: 800,
                                                                            color: isChecked ? activeCategory.accent : '#64748b',
                                                                            background: '#ffffff',
                                                                            border: `1px solid ${isChecked ? activeCategory.border : '#dbe4ef'}`,
                                                                            borderRadius: 999,
                                                                            padding: '5px 9px',
                                                                        }}
                                                                    >
                                                                        {service.group}
                                                                    </span>
                                                                ) : <span />}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleToggleDraftService(service.id)}
                                                                    style={{
                                                                        width: 18,
                                                                        height: 18,
                                                                        margin: 0,
                                                                        accentColor: activeCategory.accent,
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span
                                                                style={{
                                                                    fontSize: 14,
                                                                    fontWeight: 700,
                                                                    lineHeight: 1.45,
                                                                    color: '#0f172a',
                                                                }}
                                                            >
                                                                {service.label}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                flexWrap: 'wrap',
                                padding: '16px 20px 20px',
                                borderTop: '1px solid #e2e8f0',
                                background: '#fcfcfd',
                            }}
                        >
                            <span style={{ fontSize: 13, color: '#64748b' }}>
                                {draftSelection.length === 0
                                    ? 'Select at least one title to confirm this category.'
                                    : `${draftSelection.length} title${draftSelection.length > 1 ? 's' : ''} ready to confirm`}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                                <button
                                    className="tp-btn"
                                    type="button"
                                    onClick={handleClearSelection}
                                    disabled={
                                        draftSelection.length === 0
                                        && (selectedServiceMatrix[activeCategory.slug] || []).length === 0
                                    }
                                    style={{
                                        padding: '11px 16px',
                                        borderRadius: 12,
                                        border: '1px solid #dbe4ef',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: draftSelection.length === 0
                                            && (selectedServiceMatrix[activeCategory.slug] || []).length === 0
                                            ? 'not-allowed'
                                            : 'pointer',
                                        opacity: draftSelection.length === 0
                                            && (selectedServiceMatrix[activeCategory.slug] || []).length === 0
                                            ? 0.55
                                            : 1,
                                    }}
                                >
                                    Clear Selection
                                </button>
                                <button
                                    className="tp-btn"
                                    type="button"
                                    onClick={handleApplySelection}
                                    disabled={draftSelection.length === 0}
                                    style={{
                                        padding: '11px 18px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: draftSelection.length === 0 ? '#cbd5e1' : activeCategory.accent,
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        fontSize: 13,
                                        cursor: draftSelection.length === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: draftSelection.length === 0
                                            ? 'none'
                                            : '0 14px 28px rgba(15, 23, 42, 0.14)',
                                    }}
                                >
                                    Select Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </>
    );
};

export default TestList;
