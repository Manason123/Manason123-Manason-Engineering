import React, { useState } from 'react';
import { api, downloadCsv, formatMoney } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { WorkspacePayload } from '../types.ts';

interface FinancePageProps {
  data: WorkspacePayload;
  selectedProjectId: string;
  lang: Language;
  onRefresh: () => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
  committed: 'Committed Cost',
  actual: 'Actual Cost',
  cash_paid: 'Cash Paid',
  cash_received: 'Cash Received (IPC)',
  reversal: 'Reversal',
};

export const FinancePage: React.FC<FinancePageProps> = ({
  data,
  selectedProjectId,
  lang,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState(
    selectedProjectId === 'all' ? data.projects[0]?.id || '' : selectedProjectId
  );
  const [type, setType] = useState<'committed' | 'actual' | 'cash_paid' | 'cash_received'>('cash_paid');
  const [category, setCategory] = useState('Supplier Disbursement');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  if (data.hideMoney) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Restricted View
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {t(lang, 'hiddenMoneyNotice')}
        </p>
      </div>
    );
  }

  const entries = data.ledger.filter(
    (l) => selectedProjectId === 'all' || l.projectId === selectedProjectId
  );

  const canWrite = ['owner', 'pm', 'accountant'].includes(data.user.role);
  const canApprove = ['owner', 'accountant'].includes(data.user.role);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.createLedgerEntry({
        projectId: selectedProjectId === 'all' ? projectId : selectedProjectId,
        type,
        category,
        reference,
        description,
        amount: Number(amount),
      });
      setReference('');
      setDescription('');
      setAmount('');
      setShowForm(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save ledger entry');
    }
  }

  async function handleApprove(id: string) {
    setErr('');
    try {
      await api.approveLedgerEntry(id);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to approve payment');
    }
  }

  async function handleReverse(id: string) {
    setErr('');
    try {
      await api.reverseLedgerEntry(id);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to reverse entry');
    }
  }

  function handleExport() {
    downloadCsv('buildtrack-ledger.csv', [
      ['Date', 'Reference', 'Type', 'Category', 'Description', 'Amount', 'Status', 'Created By'],
      ...entries.map((l) => [
        l.date,
        l.reference,
        l.type,
        l.category,
        l.description,
        l.amount,
        l.status,
        l.createdBy,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navFinance')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Independent tracking of committed obligations, certified actual costs, and cash flow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
          >
            {t(lang, 'exportCsv')}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
            >
              {showForm ? 'Close Form' : t(lang, 'logTransaction')}
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Record Financial Transaction</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'committed' | 'actual' | 'cash_paid' | 'cash_received')
              }
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="cash_paid">Cash Paid (Disbursement)</option>
              <option value="cash_received">Cash Received (Client IPC)</option>
              <option value="actual">Actual Certified Cost</option>
              <option value="committed">Committed Subcontract / PO</option>
            </select>
            <input
              type="text"
              required
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Reference (e.g. PAY-108)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              required
              min="1"
              placeholder="Amount (RWF)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
            <input
              type="text"
              required
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 sm:col-span-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Save Entry
            </button>
          </div>
        </form>
      )}

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="text-left font-medium px-5 py-3">Date / Ref</th>
                <th className="text-left font-medium px-4 py-3">Type & Details</th>
                <th className="text-right font-medium px-4 py-3">Amount</th>
                <th className="text-right font-medium px-5 py-3">Status & Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry) => {
                const proj = data.projects.find((p) => p.id === entry.projectId);
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      entry.status === 'reversed' ? 'opacity-55' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{entry.date}</div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{entry.reference}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{entry.description}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {TYPE_LABELS[entry.type] || entry.type} · {entry.category} · {proj?.code}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                        entry.type === 'cash_received'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {entry.type === 'cash_received' ? '+' : ''}
                      {formatMoney(entry.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`text-xs font-medium capitalize ${
                            entry.status === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : entry.status === 'reversed'
                                ? 'text-slate-500'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                        {canApprove && entry.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(entry.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white"
                          >
                            {t(lang, 'approve')}
                          </button>
                        )}
                        {canApprove && entry.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleReverse(entry.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {t(lang, 'reverse')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
