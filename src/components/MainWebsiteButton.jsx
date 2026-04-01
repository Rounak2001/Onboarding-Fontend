import React from 'react';

const MainWebsiteButton = ({ light = false }) => {
    const brand = {
        mirage: '#081828',
        mint: '#28C088',
        platinum: '#E0E8E8',
    };

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        border: light ? `1px solid ${brand.platinum}` : '1px solid rgba(255,255,255,0.1)',
        background: light ? '#ffffff' : 'rgba(255,255,255,0.05)',
        color: light ? brand.mirage : '#ffffff',
        backdropFilter: light ? 'none' : 'blur(8px)',
    };

    return (
        <a
            href="https://taxplanadvisor.in"
            className="tp-btn"
            style={buttonStyle}
            onMouseOver={(e) => {
                e.currentTarget.style.background = light ? '#f8fafc' : 'rgba(255,255,255,0.1)';
                if (light) e.currentTarget.style.borderColor = brand.mint;
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = light ? '#ffffff' : 'rgba(255,255,255,0.05)';
                if (light) e.currentTarget.style.borderColor = brand.platinum;
            }}
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="m15 18-6-6 6-6" />
            </svg>
            Home Page
        </a>
    );
};

export default MainWebsiteButton;
