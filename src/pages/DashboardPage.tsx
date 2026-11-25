import React, { useState } from 'react';
import { api, formatMoney } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { ProjectWithMetrics, WorkspacePayload } from '../types.ts';

interface DashboardPageProps {
  data: WorkspacePayload;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  lang: Language;
  onRefresh: () => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  selectedProjectId,
  onSelectProject,
  lang,
  onRefresh,
}) => {
  const [showNewProject, setShowNewProject] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [baselineBudget, setBaselineBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const projects: ProjectWithMetrics[] =
    selectedProjectId === 'all'
      ? data.projects
      : data.projects.filter((p) => p.id === selectedProjectId);

  const totals = projects.reduce(
    (acc, p) => {
      acc.contractValue += p.metrics.revisedContractValue;
      acc.revisedBudget += p.metrics.revisedBudget;
      acc.committedCost += p.metrics.committedCost;
      acc.actualCost += p.metrics.actualCost;
      acc.cashPaid += p.metrics.cashPaid;
      acc.cashReceived += p.metrics.cashReceived;
      acc.estimatedFinalCost += p.metrics.estimatedFinalCost;
      return acc;
    },
    {
      contractValue: 0,
      revisedBudget: 0,
      committedCost: 0,
      actualCost: 0,
      cashPaid: 0,
      cashReceived: 0,
      estimatedFinalCost: 0,
    }
  );

  const projectedMargin = totals.contractValue - totals.estimatedFinalCost;
  const marginPct =
    totals.contractValue > 0 ? ((projectedMargin / totals.contractValue) * 100).toFixed(1) : '0.0';

  const allAlerts = projects.flatMap((p) =>
    p.metrics.alerts.map((a) => ({ ...a, projectName: p.name, projectCode: p.code }))
  );

  const avgPhysical =
    projects.length > 0
      ? (projects.reduce((s, p) => s + p.physicalProgress, 0) / projects.length).toFixed(1)
      : '0.0';
  const avgPlanned =
    projects.length > 0
      ? (projects.reduce((s, p) => s + p.plannedProgress, 0) / projects.length).toFixed(1)
      : '0.0';

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api.createProject({
        name,
        code,
        client,
        location,
        contractValue: Number(contractValue) || 0,
        baselineBudget: Number(baselineBudget) || 0,
      });
      setName('');
      setCode('');
      setClient('');
      setLocation('');
      setContractValue('');
      setBaselineBudget('');
      setShowNewProject(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navDashboard')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {projects.length} active {projects.length === 1 ? 'project' : 'projects'} · Avg physical progress{' '}
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{avgPhysical}%</span> vs{' '}
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{avgPlanned}%</span> planned
          </p>
        </div>

        {(data.user.role === 'owner' || data.user.role === 'pm') && (
          <button
            type="button"
            onClick={() => setShowNewProject((v) => !v)}
            className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
          >
            {showNewProject ? 'Close Form' : 'New Project'}
          </button>
        )}
      </div>

      {showNewProject && (
        <form
          onSubmit={handleCreateProject}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Register New Project</div>
          {err && <div className="text-xs text-red-600 dark:text-red-400">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              required
              placeholder="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Project Code (e.g. ME-2026-03)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Client Organization"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Site Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              min="0"
              placeholder="Contract Value (RWF)"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
            <input
              type="number"
              min="0"
              placeholder="Baseline Budget (RWF)"
              value={baselineBudget}
              onChange={(e) => setBaselineBudget(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewProject(false)}
              className="px-4 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white"
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {data.hideMoney ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300">
          {t(lang, 'hiddenMoneyNotice')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'contractValue')}</div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
              {formatMoney(totals.contractValue)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {t(lang, 'revisedBudget')}: {formatMoney(totals.revisedBudget)}
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'committedCost')} vs {t(lang, 'actualCost')}
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
              {formatMoney(totals.actualCost)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Committed: {formatMoney(totals.committedCost)}
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'cashReceived')} vs {t(lang, 'cashPaid')}
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
              {formatMoney(totals.cashReceived - totals.cashPaid)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              In: {formatMoney(totals.cashReceived)} · Out: {formatMoney(totals.cashPaid)}
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'forecastFinal')}</div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
              {formatMoney(totals.estimatedFinalCost)}
            </div>
            <div
              className={`text-xs mt-1 tabular-nums font-medium ${
                projectedMargin >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {t(lang, 'projectedMargin')}: {formatMoney(projectedMargin)} ({marginPct}%)
            </div>
          </div>
        </div>
      )}

      {/* Project Health Comparison Table */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Portfolio Control Matrix
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click a project row to filter workspace
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="text-left font-medium px-5 py-3">Project</th>
                <th className="text-left font-medium px-4 py-3">Schedule ({t(lang, 'scheduleProgress')})</th>
                {!data.hideMoney && <th className="text-right font-medium px-4 py-3">Revised Budget</th>}
                {!data.hideMoney && <th className="text-right font-medium px-4 py-3">Forecast Final</th>}
                {!data.hideMoney && <th className="text-right font-medium px-4 py-3">Variance</th>}
                <th className="text-right font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((p) => {
                const behind = p.metrics.scheduleVariancePct < -4;
                const overBudget = !data.hideMoney && p.metrics.budgetVariance < 0;
                const stateText =
                  overBudget || behind ? 'At Risk' : 'On Track';
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(selectedProjectId === p.id ? 'all' : p.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">{p.code}</span> · {p.client} · {p.location}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 min-w-[200px]">
                      <div className="flex items-center justify-between text-xs tabular-nums mb-1.5">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.physicalProgress}% actual
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {p.plannedProgress}% plan
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            behind ? 'bg-amber-600' : 'bg-teal-600'
                          }`}
                          style={{ width: `${Math.min(100, p.physicalProgress)}%` }}
                        />
                      </div>
                    </td>
                    {!data.hideMoney && (
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatMoney(p.metrics.revisedBudget, p.currency)}
                      </td>
                    )}
                    {!data.hideMoney && (
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                        {formatMoney(p.metrics.estimatedFinalCost, p.currency)}
                      </td>
                    )}
                    {!data.hideMoney && (
                      <td
                        className={`px-4 py-3.5 text-right font-mono tabular-nums font-medium ${
                          p.metrics.budgetVariance >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {p.metrics.budgetVariance >= 0 ? '+' : ''}
                        {formatMoney(p.metrics.budgetVariance, p.currency)}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          stateText === 'On Track'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {stateText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Alerts */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            {t(lang, 'activeAlerts')}
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {allAlerts.length} active
          </span>
        </div>
        {allAlerts.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
            All monitored thresholds (budget, schedule, stock, cash balance) are within normal range.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allAlerts.map((alert, idx) => (
              <div key={`${alert.projectCode}-${alert.code}-${idx}`} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {alert.message}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-mono">{alert.projectCode}</span> · {alert.projectName}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                    alert.severity === 'critical'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
