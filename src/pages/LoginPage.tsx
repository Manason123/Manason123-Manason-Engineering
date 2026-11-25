import React, { useState } from 'react';
import { api } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';

interface LoginPageProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onAuthenticated: (token: string) => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@buildtrack.rw', note: 'Full portfolio & approvals' },
  { label: 'Project Manager', email: 'pm@buildtrack.rw', note: 'BOQ, variations, report approvals' },
  { label: 'Site Engineer', email: 'engineer@buildtrack.rw', note: 'Daily reports & material requests' },
  { label: 'Storekeeper', email: 'store@buildtrack.rw', note: 'Stock & deliveries (money hidden)' },
  { label: 'Accountant', email: 'accountant@buildtrack.rw', note: 'Cost ledger, IPCs & payments' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ lang, setLang, onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('owner@buildtrack.rw');
  const [password, setPassword] = useState('Demo12345');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqRole, setReqRole] = useState('engineer');
  const [reqNote, setReqNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onAuthenticated(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await api.requestAccess({
        name: reqName,
        email: reqEmail,
        requestedRole: reqRole,
        note: reqNote,
      });
      setSuccessMsg('Access request submitted. An owner can approve it from Team & Audit.');
      setReqName('');
      setReqEmail('');
      setReqNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between px-6 py-8">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            {t(lang, 'brand')}
          </span>
          <span className="mx-2 text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t(lang, 'companySub')}</span>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {(['en', 'rw', 'fr'] as Language[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                lang === code
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400 tracking-wide">
              Construction Operations & Cost Control
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
              Baseline BOQ, site progress, materials, and cash flow in one ledger.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Track contract variations independently from committed costs, actuals, and cash disbursements across active civil and infrastructure sites.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              {t(lang, 'quickDemo')}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setEmail(acc.email);
                    setPassword('Demo12345');
                    setError('');
                  }}
                  className="w-full py-2.5 px-2 -mx-2 rounded-md flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {acc.label}
                      <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{acc.email}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{acc.note}</div>
                  </div>
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-400 whitespace-nowrap shrink-0">
                    Select
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-6">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'signIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('request');
                setError('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'request'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'requestAccess')}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300">
              {successMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'password')}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : t(lang, 'signIn')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="e.g. Aline Mukashyaka"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'email')}
                </label>
                <input
                  type="email"
                  required
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="name@manason.rw"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Requested Role
                </label>
                <select
                  value={reqRole}
                  onChange={(e) => setReqRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="engineer">Site Engineer</option>
                  <option value="pm">Project Manager</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Project / Assignment Note
                </label>
                <textarea
                  rows={2}
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : t(lang, 'requestAccess')}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className="max-w-5xl w-full mx-auto text-xs text-slate-500 dark:text-slate-500 flex items-center justify-between">
        <span>Manason Engineering Ltd</span>
        <span>English · Kinyarwanda · Français</span>
      </footer>
    </div>
  );
};
