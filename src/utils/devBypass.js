const isTruthyDevToggle = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return true;
    return !['0', 'false', 'no', 'off'].includes(normalized);
};

export const DEV_FACE_VERIFICATION_BYPASS = Boolean(
    import.meta.env.DEV && isTruthyDevToggle(import.meta.env.VITE_DEV_BYPASS_FACE_VERIFICATION)
);

export const isFaceVerificationSatisfied = (user) => {
    return Boolean(user?.is_verified || DEV_FACE_VERIFICATION_BYPASS);
};

