import React, { useState } from 'react';
import { api } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { WorkspacePayload } from '../types.ts';

interface TeamPageProps {
  data: WorkspacePayload;
  lang: Language;
  onRefresh: () => Promise<void>;
}

export const TeamPage: React.FC<TeamPageProps> = ({ data, lang, onRefresh }) => {
  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('engineer');
  const [err, setErr] = useState('');

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.createUser({ name, email, role });
      setName('');
      setEmail('');
      setShowAddUser(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to add user');
    }
  }

  async function handleAccessDecision(id: string, decision: 'approved' | 'rejected') {
    setErr('');
    try {
      await api.decideAccessRequest(id, decision);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Action failed');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navTeam')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Role-based access control, pending access approvals, and immutable audit history
          </p>
        </div>

        {data.user.role === 'owner' && (
          <button
            type="button"
            onClick={() => setShowAddUser((v) => !v)}
            className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
          >
            {showAddUser ? 'Close Form' : 'Add Team Member'}
          </button>
        )}
      </div>

      {err && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      {showAddUser && (
        <form
          onSubmit={handleAddUser}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            Create Team Account (Default password: Demo12345)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="email"
              required
              placeholder="Work Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="pm">Project Manager</option>
              <option value="engineer">Site Engineer</option>
              <option value="storekeeper">Storekeeper</option>
              <option value="accountant">Accountant</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Create User
            </button>
          </div>
        </form>
      )}

      {data.user.role === 'owner' && data.accessRequests.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Access Requests ({data.accessRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.accessRequests.map((req) => (
              <div key={req.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {req.name}
                    <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{req.email}</span>
                    <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs capitalize text-teal-700 dark:text-teal-400">{req.requestedRole}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{req.note || 'No note provided'}</div>
                </div>
                {req.status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAccessDecision(req.id, 'approved')}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white"
                    >
                      {t(lang, 'approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccessDecision(req.id, 'rejected')}
                      className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700"
                    >
                      {t(lang, 'reject')}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium capitalize text-slate-500">{req.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.users.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Active Staff Directory ({data.users.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</div>
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 capitalize">
                  {u.role} · {u.projectIds.length} projects
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Audit Log ({data.auditLog.length})
          </h2>
        </div>
        {data.auditLog.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
            Audit history is visible to Owners, Project Managers, and Accountants.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.auditLog.map((entry) => (
              <div key={entry.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-sm text-slate-900 dark:text-slate-100">{entry.details}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {entry.actorName} ({entry.actorRole}) · <span className="font-mono">{entry.action}</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                  {entry.timestamp.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
