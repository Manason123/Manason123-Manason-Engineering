import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { api, getStoredToken, setStoredToken } from './api.ts';
import type { Language } from './i18n.ts';
import { t } from './i18n.ts';
import { BoqPage } from './pages/BoqPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { FinancePage } from './pages/FinancePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MaterialsPage } from './pages/MaterialsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { TeamPage } from './pages/TeamPage.tsx';
import type { WorkspacePayload } from './types.ts';

type NavKey = 'dashboard' | 'boq' | 'reports' | 'materials' | 'finance' | 'team';

export function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getStoredToken());
  const [error, setError] = useState<string>('');
  const [nav, setNav] = useState<NavKey>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [lang, setLang] = useState<Language>('en');
  const [dark, setDark] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const loadWorkspace = useCallback(async () => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await api.getWorkspace();
      setData(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load workspace';
      setError(msg);
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('auth')) {
        setStoredToken(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function handleAuthenticated(newToken: string) {
    setStoredToken(newToken);
    setToken(newToken);
    setNav('dashboard');
  }

  function handleSignOut() {
    setStoredToken(null);
    setToken(null);
    setData(null);
  }

  if (!token) {
    return <LoginPage lang={lang} setLang={setLang} onAuthenticated={handleAuthenticated} />;
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading BuildTrack Pro workspace...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-sm text-red-600 dark:text-red-400">{error || 'Session unavailable'}</div>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 text-white"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  const navItems: Array<{ key: NavKey; label: string; icon: React.ReactNode; hidden?: boolean }> = [
    { key: 'dashboard', label: t(lang, 'navDashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'boq', label: t(lang, 'navBoq'), icon: <FileSpreadsheet className="w-4 h-4" /> },
    { key: 'reports', label: t(lang, 'navReports'), icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'materials', label: t(lang, 'navMaterials'), icon: <Package className="w-4 h-4" /> },
    {
      key: 'finance',
      label: t(lang, 'navFinance'),
      icon: <DollarSign className="w-4 h-4" />,
      hidden: data.hideMoney,
    },
    { key: 'team', label: t(lang, 'navTeam'), icon: <Users className="w-4 h-4" /> },
  ];

  const activeProject =
    selectedProjectId === 'all'
      ? null
      : data.projects.find((p) => p.id === selectedProjectId) || null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'brand')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t(lang, 'companySub')}</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = nav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setNav(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-teal-600'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800">
              {(['en', 'rw', 'fr'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    lang === code
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle color theme"
              className="p-2 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-900 dark:text-white truncate">{data.user.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
              {data.user.role} · {data.user.email}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2.5 w-full py-1.5 px-3 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t(lang, 'signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-64 max-w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 p-4 justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-display text-base font-bold">{t(lang, 'brand')}</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-md text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems
                  .filter((item) => !item.hidden)
                  .map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setNav(item.key);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md ${
                        nav === item.key
                          ? 'bg-slate-900 text-white dark:bg-teal-600'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 px-3 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700"
            >
              {t(lang, 'signOut')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              <span>{t(lang, 'brand')}</span>
              <span className="mx-2">/</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {activeProject ? `${activeProject.code} · ${activeProject.name}` : t(lang, 'allProjects')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              aria-label="Project filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 max-w-[220px] truncate"
            >
              <option value="all">{t(lang, 'allProjects')}</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {nav === 'dashboard' && (
            <DashboardPage
              data={data}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              lang={lang}
              onRefresh={loadWorkspace}
            />
          )}
          {nav === 'boq' && (
            <BoqPage
              data={data}
              selectedProjectId={selectedProjectId}
              lang={lang}
              onRefresh={loadWorkspace}
            />
          )}
          {nav === 'reports' && (
            <ReportsPage
              data={data}
              selectedProjectId={selectedProjectId}
              lang={lang}
              onRefresh={loadWorkspace}
            />
          )}
          {nav === 'materials' && (
            <MaterialsPage
              data={data}
              selectedProjectId={selectedProjectId}
              lang={lang}
              onRefresh={loadWorkspace}
            />
          )}
          {nav === 'finance' && (
            <FinancePage
              data={data}
              selectedProjectId={selectedProjectId}
              lang={lang}
              onRefresh={loadWorkspace}
            />
          )}
          {nav === 'team' && (
            <TeamPage data={data} lang={lang} onRefresh={loadWorkspace} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
