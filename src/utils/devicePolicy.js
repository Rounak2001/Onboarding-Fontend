const MOBILE_OR_TABLET_UA_REGEX = /android|iphone|ipad|ipod|mobile|tablet|silk|kindle|playbook|bb10/i;

export const isAssessmentDeviceBlocked = (userAgentInput, maxTouchPointsInput) => {
    const hasNavigator = typeof navigator !== 'undefined';
    const userAgent = String(
        userAgentInput
        ?? (hasNavigator ? navigator.userAgent : '')
    );
    const maxTouchPoints = Number(
        maxTouchPointsInput
        ?? (hasNavigator ? navigator.maxTouchPoints : 0)
    );

    const looksLikeIpadDesktop = /macintosh/i.test(userAgent) && maxTouchPoints > 1;
    return MOBILE_OR_TABLET_UA_REGEX.test(userAgent) || looksLikeIpadDesktop;
};

export default isAssessmentDeviceBlocked;
