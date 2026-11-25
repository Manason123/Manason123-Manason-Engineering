import React, { useState } from 'react';
import { api } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { WorkspacePayload } from '../types.ts';

interface ReportsPageProps {
  data: WorkspacePayload;
  selectedProjectId: string;
  lang: Language;
  onRefresh: () => Promise<void>;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  data,
  selectedProjectId,
  lang,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState(
    selectedProjectId === 'all' ? data.projects[0]?.id || '' : selectedProjectId
  );
  const [reportDate, setReportDate] = useState('2026-11-25');
  const [weather, setWeather] = useState('Clear');
  const [workforceCount, setWorkforceCount] = useState('38');
  const [progressDelta, setProgressDelta] = useState('1.0');
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [err, setErr] = useState('');

  const canSubmit = ['owner', 'pm', 'engineer'].includes(data.user.role);
  const canApprove = ['owner', 'pm'].includes(data.user.role);

  const reports = data.reports.filter(
    (r) => selectedProjectId === 'all' || r.projectId === selectedProjectId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.createReport({
        projectId: selectedProjectId === 'all' ? projectId : selectedProjectId,
        reportDate,
        weather,
        workforceCount: Number(workforceCount),
        progressDelta: Number(progressDelta),
        summary,
        blockers,
      });
      setSummary('');
      setBlockers('');
      setShowForm(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to submit daily report');
    }
  }

  async function handleDecision(id: string, decision: 'approved' | 'rejected') {
    setErr('');
    try {
      await api.decideReport(
        id,
        decision,
        decision === 'approved' ? 'Verified and applied to physical progress.' : 'Clarification requested.'
      );
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to review report');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navReports')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daily site log with duplicate-date prevention and PM progress sign-off
          </p>
        </div>

        {canSubmit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
          >
            {showForm ? 'Close Form' : t(lang, 'submitReport')}
          </button>
        )}
      </div>

      {err && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">New Daily Site Report</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {selectedProjectId === 'all' && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              required
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Clear">Clear</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Rain">Rain</option>
              <option value="Heavy Rain">Heavy Rain</option>
            </select>
            <input
              type="number"
              min="0"
              required
              placeholder="Workforce on site"
              value={workforceCount}
              onChange={(e) => setWorkforceCount(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              required
              placeholder="Progress Delta (%)"
              value={progressDelta}
              onChange={(e) => setProgressDelta(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <textarea
            rows={2}
            required
            placeholder="Executed work activities and QA observations..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <input
            type="text"
            placeholder="Site blockers or delays (optional)"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Submit Report
            </button>
          </div>
        </form>
      )}

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{t(lang, 'emptyTitle')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(lang, 'emptySub')}</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.map((rep) => {
              const proj = data.projects.find((p) => p.id === rep.projectId);
              return (
                <div key={rep.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-slate-700 dark:text-slate-300">{rep.reportDate}</span>
                      <span className="mx-2">·</span>
                      <span>{proj?.code} {proj?.name}</span>
                      <span className="mx-2">·</span>
                      <span>{rep.weather}</span>
                      <span className="mx-2">·</span>
                      <span className="tabular-nums">{rep.workforceCount} workers</span>
                      <span className="mx-2">·</span>
                      <span className="font-mono tabular-nums text-teal-700 dark:text-teal-400">
                        +{rep.progressDelta}% progress
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{rep.summary}</p>
                    {rep.blockers && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">Blocker: {rep.blockers}</p>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Submitted by {rep.submittedBy}
                      {rep.reviewedBy ? ` · Reviewed by ${rep.reviewedBy}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status === 'submitted' && canApprove ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDecision(rep.id, 'approved')}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 whitespace-nowrap"
                        >
                          {t(lang, 'approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(rep.id, 'rejected')}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        >
                          {t(lang, 'reject')}
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs font-medium capitalize ${
                          rep.status === 'approved'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : rep.status === 'rejected'
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {rep.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
