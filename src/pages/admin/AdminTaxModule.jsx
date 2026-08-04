import { useState } from 'react';
import { FileText, Receipt } from 'lucide-react';
import AdminTdsReport from './AdminTdsReport';
import AdminGstReport from './AdminGstReport';

// Tabbed container for the "Tax" sidebar entry — TDS report and GST report
// share a single sidebar item, switched via internal tab state (not routes).
const AdminTaxModule = ({ isLight, viewportWidth, token, themeVars }) => {
    const isMobile = viewportWidth <= 768;
    const [subTab, setSubTab] = useState('tds'); // 'tds' | 'gst'

    const tabs = [
        { id: 'tds', label: 'TDS Report', icon: FileText },
        { id: 'gst', label: 'GST Report', icon: Receipt },
    ];

    return (
        <div style={{ ...themeVars, padding: isMobile ? '0' : '24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--admin-tab-idle)', padding: 6, borderRadius: 14, width: 'fit-content' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 10, border: 'none',
                            background: subTab === tab.id ? (isLight ? '#ffffff' : 'rgba(59,130,246,0.18)') : 'transparent',
                            color: subTab === tab.id ? '#3b82f6' : 'var(--admin-text-secondary)',
                            fontWeight: 800, fontSize: 13, cursor: 'pointer',
                            boxShadow: subTab === tab.id ? 'var(--admin-shadow-md)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'tds' && (
                <AdminTdsReport isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} />
            )}
            {subTab === 'gst' && (
                <AdminGstReport isLight={isLight} viewportWidth={viewportWidth} token={token} themeVars={themeVars} />
            )}
        </div>
    );
};

export default AdminTaxModule;
