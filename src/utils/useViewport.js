import { useEffect, useState } from 'react';

const getWidth = () => {
    if (typeof window === 'undefined') {
        return 1024;
    }
    return window.innerWidth || 1024;
};

export const useViewportWidth = () => {
    const [viewportWidth, setViewportWidth] = useState(getWidth);

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(getWidth());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return viewportWidth;
};

export const useIsNarrowScreen = (maxWidth = 768) => {
    const viewportWidth = useViewportWidth();
    return viewportWidth <= maxWidth;
};
