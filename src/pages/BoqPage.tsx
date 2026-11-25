import React, { useState } from 'react';
import { api, downloadCsv, formatMoney } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { WorkspacePayload } from '../types.ts';

interface BoqPageProps {
  data: WorkspacePayload;
  selectedProjectId: string;
  lang: Language;
  onRefresh: () => Promise<void>;
}

export const BoqPage: React.FC<BoqPageProps> = ({ data, selectedProjectId, lang, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'boq' | 'variations'>('boq');
  const [showAddBoq, setShowAddBoq] = useState(false);
  const [showAddVar, setShowAddVar] = useState(false);
  const [err, setErr] = useState('');

  const defaultPid =
    selectedProjectId === 'all' ? data.projects[0]?.id || '' : selectedProjectId;

  const [boqProject, setBoqProject] = useState(defaultPid);
  const [boqCode, setBoqCode] = useState('');
  const [boqCat, setBoqCat] = useState('Civil Works');
  const [boqDesc, setBoqDesc] = useState('');
  const [boqUnit, setBoqUnit] = useState('m3');
  const [boqQty, setBoqQty] = useState('');
  const [boqRate, setBoqRate] = useState('');

  const [varProject, setVarProject] = useState(defaultPid);
  const [varTitle, setVarTitle] = useState('');
  const [varReason, setVarReason] = useState('');
  const [varAmount, setVarAmount] = useState('');
  const [varDays, setVarDays] = useState('0');

  const activeProject =
    selectedProjectId !== 'all' ? data.projects.find((p) => p.id === selectedProjectId) : undefined;

  const filteredBoq = data.boqItems.filter((item) => {
    if (selectedProjectId !== 'all' && item.projectId !== selectedProjectId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const filteredVariations = data.variations.filter((v) => {
    if (selectedProjectId !== 'all' && v.projectId !== selectedProjectId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.reference.toLowerCase().includes(q) ||
      v.title.toLowerCase().includes(q) ||
      v.reason.toLowerCase().includes(q)
    );
  });

  const canEdit = ['owner', 'pm', 'engineer'].includes(data.user.role);
  const canApprove = ['owner', 'pm'].includes(data.user.role);

  async function handleAddBoq(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.addBoqItem({
        projectId: selectedProjectId === 'all' ? boqProject : selectedProjectId,
        code: boqCode,
        category: boqCat,
        description: boqDesc,
        unit: boqUnit,
        quantity: Number(boqQty),
        unitRate: Number(boqRate),
      });
      setBoqCode('');
      setBoqDesc('');
      setBoqQty('');
      setBoqRate('');
      setShowAddBoq(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to add BOQ item');
    }
  }

  async function handleAddVariation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.createVariation({
        projectId: selectedProjectId === 'all' ? varProject : selectedProjectId,
        title: varTitle,
        reason: varReason,
        amount: Number(varAmount),
        scheduleImpactDays: Number(varDays),
      });
      setVarTitle('');
      setVarReason('');
      setVarAmount('');
      setVarDays('0');
      setShowAddVar(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to submit variation');
    }
  }

  async function handleFreeze(projectId: string) {
    setErr('');
    try {
      await api.freezeBaseline(projectId);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to freeze baseline');
    }
  }

  async function handleDecideVariation(id: string, decision: 'approved' | 'rejected') {
    setErr('');
    try {
      await api.decideVariation(id, decision);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Action failed');
    }
  }

  function handleExport() {
    if (tab === 'boq') {
      downloadCsv('buildtrack-boq.csv', [
        ['Code', 'Category', 'Description', 'Unit', 'Quantity', 'Completed Qty', 'Unit Rate', 'Total'],
        ...filteredBoq.map((b) => [
          b.code,
          b.category,
          b.description,
          b.unit,
          b.quantity,
          b.completedQty,
          data.hideMoney ? 0 : b.unitRate,
          data.hideMoney ? 0 : b.quantity * b.unitRate,
        ]),
      ]);
    } else {
      downloadCsv('buildtrack-variations.csv', [
        ['Reference', 'Title', 'Reason', 'Amount', 'Schedule Impact Days', 'Status', 'Requested By'],
        ...filteredVariations.map((v) => [
          v.reference,
          v.title,
          v.reason,
          v.amount,
          v.scheduleImpactDays,
          v.status,
          v.requestedBy,
        ]),
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navBoq')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bill of Quantities baseline control and approved contract variations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {t(lang, 'exportCsv')}
          </button>
          {activeProject && canApprove && !activeProject.baselineFrozen && (
            <button
              type="button"
              onClick={() => handleFreeze(activeProject.id)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 whitespace-nowrap shrink-0"
            >
              {t(lang, 'freezeBaseline')}
            </button>
          )}
          {canEdit && tab === 'boq' && (
            <button
              type="button"
              onClick={() => setShowAddBoq((v) => !v)}
              className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
            >
              {t(lang, 'addBoqItem')}
            </button>
          )}
          {canEdit && tab === 'variations' && !data.hideMoney && (
            <button
              type="button"
              onClick={() => setShowAddVar((v) => !v)}
              className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
            >
              {t(lang, 'submitVariation')}
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('boq')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'boq'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Baseline BOQ ({filteredBoq.length})
          </button>
          {!data.hideMoney && (
            <button
              type="button"
              onClick={() => setTab('variations')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === 'variations'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Variation Orders ({filteredVariations.length})
            </button>
          )}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, category, or description..."
          className="w-full sm:w-72 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        />
      </div>

      {showAddBoq && tab === 'boq' && (
        <form
          onSubmit={handleAddBoq}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Add BOQ Line Item</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedProjectId === 'all' && (
              <select
                value={boqProject}
                onChange={(e) => setBoqProject(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} {p.baselineFrozen ? '(Frozen)' : ''}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              required
              placeholder="Item Code (e.g. 04.12)"
              value={boqCode}
              onChange={(e) => setBoqCode(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              required
              placeholder="Category"
              value={boqCat}
              onChange={(e) => setBoqCat(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              required
              placeholder="Description"
              value={boqDesc}
              onChange={(e) => setBoqDesc(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 sm:col-span-2"
            />
            <input
              type="text"
              required
              placeholder="Unit (m3, ton, ls)"
              value={boqUnit}
              onChange={(e) => setBoqUnit(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="Quantity"
              value={boqQty}
              onChange={(e) => setBoqQty(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
            <input
              type="number"
              required
              min="0"
              placeholder="Unit Rate (RWF)"
              value={boqRate}
              onChange={(e) => setBoqRate(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddBoq(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Save BOQ Item
            </button>
          </div>
        </form>
      )}

      {showAddVar && tab === 'variations' && (
        <form
          onSubmit={handleAddVariation}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Submit Variation Order</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedProjectId === 'all' && (
              <select
                value={varProject}
                onChange={(e) => setVarProject(e.target.value)}
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
              type="text"
              required
              placeholder="Variation Title"
              value={varTitle}
              onChange={(e) => setVarTitle(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              required
              placeholder="Engineering / Client Reason"
              value={varReason}
              onChange={(e) => setVarReason(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              required
              placeholder="Cost Impact (RWF)"
              value={varAmount}
              onChange={(e) => setVarAmount(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
            <input
              type="number"
              placeholder="Schedule Impact (days)"
              value={varDays}
              onChange={(e) => setVarDays(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddVar(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Submit Variation
            </button>
          </div>
        </form>
      )}

      {tab === 'boq' ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
          {filteredBoq.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{t(lang, 'emptyTitle')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(lang, 'emptySub')}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="text-left font-medium px-5 py-3">Code</th>
                    <th className="text-left font-medium px-4 py-3">Work Item</th>
                    <th className="text-right font-medium px-4 py-3">Completed / Qty</th>
                    {!data.hideMoney && <th className="text-right font-medium px-4 py-3">Unit Rate</th>}
                    {!data.hideMoney && <th className="text-right font-medium px-5 py-3">Baseline Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBoq.map((item) => {
                    const proj = data.projects.find((p) => p.id === item.projectId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{item.description}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.category} · {proj?.code} {proj?.baselineFrozen ? '· Frozen' : '· Editable'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.completedQty.toLocaleString()} / {item.quantity.toLocaleString()} {item.unit}
                        </td>
                        {!data.hideMoney && (
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatMoney(item.unitRate)}
                          </td>
                        )}
                        {!data.hideMoney && (
                          <td className="px-5 py-3 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {formatMoney(item.quantity * item.unitRate)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
          {filteredVariations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{t(lang, 'emptyTitle')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(lang, 'emptySub')}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="text-left font-medium px-5 py-3">Reference</th>
                    <th className="text-left font-medium px-4 py-3">Variation Details</th>
                    <th className="text-right font-medium px-4 py-3">Schedule</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-right font-medium px-5 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredVariations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {v.reference}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-white">{v.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {v.reason} · Requested by {v.requestedBy}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        +{v.scheduleImpactDays}d
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {formatMoney(v.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {v.status === 'pending' && canApprove ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDecideVariation(v.id, 'approved')}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              {t(lang, 'approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecideVariation(v.id, 'rejected')}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {t(lang, 'reject')}
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-medium capitalize ${
                              v.status === 'approved'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : v.status === 'rejected'
                                  ? 'text-red-700 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {v.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
