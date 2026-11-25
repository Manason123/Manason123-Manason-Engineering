import React, { useState } from 'react';
import { api, formatMoney } from '../api.ts';
import type { Language } from '../i18n.ts';
import { t } from '../i18n.ts';
import type { WorkspacePayload } from '../types.ts';

interface MaterialsPageProps {
  data: WorkspacePayload;
  selectedProjectId: string;
  lang: Language;
  onRefresh: () => Promise<void>;
}

const STAGE_LABEL: Record<string, string> = {
  requested: '1. Requested',
  po_issued: '2. PO Issued',
  delivered: '3. Delivered',
  confirmed: '4. Store Confirmed',
  issued: '5. Issued to Site',
  consumed: '6. Consumed',
};

export const MaterialsPage: React.FC<MaterialsPageProps> = ({
  data,
  selectedProjectId,
  lang,
  onRefresh,
}) => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [materialId, setMaterialId] = useState(data.materials[0]?.id || '');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [err, setErr] = useState('');

  const materials = data.materials.filter(
    (m) => selectedProjectId === 'all' || m.projectId === selectedProjectId
  );
  const orders = data.orders.filter(
    (o) => selectedProjectId === 'all' || o.projectId === selectedProjectId
  );

  async function handleRequestMaterial(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const mat = data.materials.find((m) => m.id === materialId) || materials[0];
    if (!mat) return;
    try {
      await api.createMaterialOrder({
        projectId: mat.projectId,
        materialId: mat.id,
        supplier: supplier || 'Approved Regional Supplier',
        quantity: Number(quantity),
      });
      setSupplier('');
      setShowOrderForm(false);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to request material');
    }
  }

  async function handleAdvance(orderId: string) {
    setErr('');
    try {
      await api.advanceMaterialOrder(orderId);
      await onRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to advance order stage');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t(lang, 'navMaterials')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Site inventory levels and procurement chain (Request → PO → Delivery → Confirm → Issue → Consume)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowOrderForm((v) => !v)}
          className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white whitespace-nowrap shrink-0"
        >
          {showOrderForm ? 'Close Form' : t(lang, 'requestMaterial')}
        </button>
      </div>

      {data.hideMoney && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-3.5 text-xs text-slate-600 dark:text-slate-300">
          {t(lang, 'hiddenMoneyNotice')}
        </div>
      )}

      {err && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      {showOrderForm && (
        <form
          onSubmit={handleRequestMaterial}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">New Material Request</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.sku} — {m.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Preferred Supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              min="1"
              required
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowOrderForm(false)}
              className="px-4 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-teal-600 text-white">
              Submit Request
            </button>
          </div>
        </form>
      )}

      {/* Stock Ledger */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Site Stock Ledger ({materials.length} SKUs)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="text-left font-medium px-5 py-3">SKU</th>
                <th className="text-left font-medium px-4 py-3">Material</th>
                <th className="text-right font-medium px-4 py-3">On Hand</th>
                <th className="text-right font-medium px-4 py-3">Reorder Level</th>
                <th className="text-right font-medium px-4 py-3">Consumed</th>
                {!data.hideMoney && <th className="text-right font-medium px-5 py-3">Unit Cost</th>}
                <th className="text-right font-medium px-5 py-3">Stock State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {materials.map((m) => {
                const low = m.stockOnHand <= m.reorderLevel;
                const proj = data.projects.find((p) => p.id === m.projectId);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.sku}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{proj?.code} · {proj?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium whitespace-nowrap">
                      {m.stockOnHand.toLocaleString()} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {m.reorderLevel.toLocaleString()} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.consumedTotal.toLocaleString()} {m.unit}
                    </td>
                    {!data.hideMoney && (
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatMoney(m.unitCost)}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          low ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {low ? 'Reorder Needed' : 'Sufficient'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Procurement Chain */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Procurement & Issue Pipeline ({orders.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="text-left font-medium px-5 py-3">Reference</th>
                <th className="text-left font-medium px-4 py-3">Material & Supplier</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                {!data.hideMoney && <th className="text-right font-medium px-4 py-3">Order Value</th>}
                <th className="text-left font-medium px-4 py-3">Current Stage</th>
                <th className="text-right font-medium px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((ord) => {
                const mat = data.materials.find((m) => m.id === ord.materialId);
                return (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {ord.reference}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{mat?.name || ord.materialId}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {ord.supplier} · Requested by {ord.requestedBy}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {ord.quantity.toLocaleString()} {mat?.unit}
                    </td>
                    {!data.hideMoney && (
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatMoney(ord.quantity * ord.unitPrice)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs font-medium text-teal-700 dark:text-teal-400 whitespace-nowrap">
                      {STAGE_LABEL[ord.stage] || ord.stage}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {ord.stage !== 'consumed' ? (
                        <button
                          type="button"
                          onClick={() => handleAdvance(ord.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          {t(lang, 'advanceStage')}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">Closed</span>
                      )}
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
