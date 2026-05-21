import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Inbox,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquare,
  Send,
  Upload,
  UserRound,
  Users,
} from 'lucide-react';
import { adminUrl } from '../../../utils/adminPath';
import { clearAdminSession, getAdminToken } from '../../../utils/adminSession';
import { cn } from './shared/cn';
import { fetchSalesPersons } from './shared/api';
import {
  getActiveSalesPerson,
  setActiveSalesPerson,
} from './shared/activeSalesPerson';
import FollowUpBell from './components/FollowUpBell';
import WhoAmIPicker from './components/WhoAmIPicker';

const NAV_ITEMS = [
  { to: 'inbox',     label: 'Inbox',     icon: Inbox,         description: 'WhatsApp bot conversations' },
  { to: 'leads',     label: 'Leads',     icon: LayoutGrid,    description: 'Sales pipeline' },
  { to: 'followups', label: 'Follow-ups',icon: MessageSquare, description: 'Due reminders' },
  { to: 'campaigns', label: 'Campaigns', icon: Megaphone,     description: 'Broadcasts & analytics' },
  { to: 'templates', label: 'Templates', icon: Send,          description: 'WhatsApp templates' },
  { to: 'team',      label: 'Team',      icon: Users,         description: 'Sales people' },
  { to: 'import',    label: 'Import',    icon: Upload,        description: 'Bulk add contacts' },
];

const PAGE_TITLES = {
  inbox:     { title: 'Inbox',     subtitle: 'Live WhatsApp bot conversations' },
  leads:     { title: 'Leads',     subtitle: 'Your sales pipeline at a glance' },
  followups: { title: 'Follow-ups',subtitle: 'Calls and tasks due today' },
  campaigns: { title: 'Campaigns', subtitle: 'Bulk templates & analytics' },
  templates: { title: 'Templates', subtitle: 'Meta-approved WhatsApp templates' },
  team:      { title: 'Sales Team',subtitle: 'Manage who answers leads' },
  import:    { title: 'Import',    subtitle: 'Add contacts from CSV or paste' },
};

export default function WhatsAppAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [salesPersons, setSalesPersons] = useState([]);
  const [activeSp, setActiveSpState] = useState(getActiveSalesPerson);

  const loadSalesPersons = useCallback(async () => {
    try {
      const data = await fetchSalesPersons();
      setSalesPersons(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  // Redirect to AdminLogin if no token
  useEffect(() => {
    if (!getAdminToken()) {
      navigate(adminUrl(), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadSalesPersons();
  }, [loadSalesPersons]);

  const handleActiveSpChange = (sp) => {
    setActiveSpState(sp);
    setActiveSalesPerson(sp);
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate(adminUrl(), { replace: true });
  };

  // Derive current page key from URL (last segment after /whatsapp/)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentKey = pathSegments[pathSegments.length - 1] || 'inbox';
  const pageTitle = PAGE_TITLES[currentKey] || { title: 'WhatsApp Admin', subtitle: '' };
  const isInbox = currentKey === 'inbox';

  return (
    <div className="flex h-screen bg-slate-50 font-[Inter,system-ui,sans-serif] text-slate-900">
      {/* SIDEBAR */}
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 h-[60px] border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <MessageSquare size={17} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">WhatsApp CRM</p>
            <p className="text-[10px] text-slate-500 leading-tight">Sales operations</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Back to admin */}
        <div className="border-t border-slate-200 p-3 space-y-1">
          <button
            type="button"
            onClick={() => navigate(adminUrl('dashboard'))}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={13} />
            Back to admin
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP BAR */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 h-[60px]">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-800 leading-tight">{pageTitle.title}</h1>
            {pageTitle.subtitle && (
              <p className="text-[11px] text-slate-500 leading-tight">{pageTitle.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <FollowUpBell activeSp={activeSp} />
            <div className="relative">
              <WhoAmIPicker
                activeSp={activeSp}
                salesPersons={salesPersons}
                onChange={handleActiveSpChange}
              />
              {!activeSp && (
                <span
                  title="Select your name to attribute calls & receive follow-up reminders"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"
                />
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className={cn('min-h-0 flex-1', isInbox ? 'overflow-hidden' : 'overflow-y-auto')}>
          <Outlet context={{ salesPersons, activeSp, reloadSalesPersons: loadSalesPersons }} />
        </main>
      </div>
    </div>
  );
}
