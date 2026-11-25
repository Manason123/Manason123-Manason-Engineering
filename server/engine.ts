import type {
  BoqItem,
  LedgerEntry,
  MaterialItem,
  MaterialOrder,
  Project,
  ProjectMetrics,
  VariationOrder,
} from './types.ts';

export function computeProjectMetrics(
  project: Project,
  boqItems: BoqItem[],
  variations: VariationOrder[],
  materials: MaterialItem[],
  orders: MaterialOrder[],
  ledger: LedgerEntry[]
): ProjectMetrics {
  const boqTotal = boqItems
    .filter((b) => b.projectId === project.id)
    .reduce((sum, item) => sum + item.quantity * item.unitRate, 0);

  const baselineBudget = project.baselineBudget > 0 ? project.baselineBudget : boqTotal;

  const projectVariations = variations.filter((v) => v.projectId === project.id);
  const approvedVariations = projectVariations
    .filter((v) => v.status === 'approved')
    .reduce((sum, v) => sum + v.amount, 0);
  const pendingVariations = projectVariations
    .filter((v) => v.status === 'pending')
    .reduce((sum, v) => sum + v.amount, 0);

  const revisedBudget = baselineBudget + approvedVariations;
  const revisedContractValue = project.contractValue + approvedVariations;

  const projectOrders = orders.filter((o) => o.projectId === project.id);
  const openPoCommitted = projectOrders
    .filter((o) => o.stage === 'po_issued' || o.stage === 'delivered')
    .reduce((sum, o) => sum + o.quantity * o.unitPrice, 0);

  const projectLedger = ledger.filter((l) => l.projectId === project.id && l.status !== 'reversed');
  const ledgerCommitted = projectLedger
    .filter((l) => l.type === 'committed' && l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);
  const actualCost = projectLedger
    .filter((l) => l.type === 'actual' && l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);
  const cashPaid = projectLedger
    .filter((l) => l.type === 'cash_paid' && l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);
  const cashReceived = projectLedger
    .filter((l) => l.type === 'cash_received' && l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);

  const committedCost = ledgerCommitted + openPoCommitted;

  // Estimate at Completion (CPI-based when progress >= 10%)
  const earnedValue = (project.physicalProgress / 100) * revisedBudget;
  const cpi = actualCost > 0 && earnedValue > 0 ? earnedValue / actualCost : 1;
  const remainingWork = Math.max(0, revisedBudget - earnedValue);
  const forecastFromProgress =
    project.physicalProgress >= 10 ? actualCost + remainingWork / Math.max(0.55, cpi) : revisedBudget;
  const estimatedFinalCost = Math.round(Math.max(committedCost + actualCost * 0.2, forecastFromProgress));

  const budgetVariance = revisedBudget - estimatedFinalCost;
  const projectedMargin = revisedContractValue - estimatedFinalCost;
  const projectedMarginPct =
    revisedContractValue > 0 ? Math.round((projectedMargin / revisedContractValue) * 1000) / 10 : 0;

  const scheduleVariancePct =
    Math.round((project.physicalProgress - project.plannedProgress) * 10) / 10;

  const variationDelayDays = projectVariations
    .filter((v) => v.status === 'approved')
    .reduce((sum, v) => sum + v.scheduleImpactDays, 0);
  const progressDelayDays = scheduleVariancePct < 0 ? Math.round(Math.abs(scheduleVariancePct) * 2.2) : 0;
  const forecastDelayDays = variationDelayDays + progressDelayDays;

  const lowStockItems = materials.filter(
    (m) => m.projectId === project.id && m.stockOnHand <= m.reorderLevel
  );

  const alerts: ProjectMetrics['alerts'] = [];
  if (budgetVariance < 0) {
    alerts.push({
      severity: estimatedFinalCost > revisedBudget * 1.08 ? 'critical' : 'warning',
      code: 'BUDGET_OVERRUN',
      message: `Forecast overrun of ${Math.abs(Math.round(budgetVariance)).toLocaleString()} ${project.currency} against revised budget`,
    });
  }
  if (scheduleVariancePct <= -5) {
    alerts.push({
      severity: scheduleVariancePct <= -10 ? 'critical' : 'warning',
      code: 'SCHEDULE_SLIP',
      message: `Physical progress trails plan by ${Math.abs(scheduleVariancePct)}% (~${forecastDelayDays} days forecast delay)`,
    });
  }
  if (lowStockItems.length > 0) {
    alerts.push({
      severity: lowStockItems.some((m) => m.stockOnHand === 0) ? 'critical' : 'warning',
      code: 'MATERIAL_SHORTAGE',
      message: `${lowStockItems.length} material SKU(s) at or below reorder threshold`,
    });
  }
  if (cashPaid > cashReceived && cashReceived > 0) {
    alerts.push({
      severity: 'warning',
      code: 'NEGATIVE_CASHFLOW',
      message: `Cash outflow exceeds client collections by ${(cashPaid - cashReceived).toLocaleString()} ${project.currency}`,
    });
  }

  return {
    projectId: project.id,
    contractValue: project.contractValue,
    revisedContractValue,
    baselineBudget,
    approvedVariations,
    pendingVariations,
    revisedBudget,
    committedCost,
    actualCost,
    cashPaid,
    cashReceived,
    netCashPosition: cashReceived - cashPaid,
    estimatedFinalCost,
    budgetVariance,
    projectedMargin,
    projectedMarginPct,
    scheduleVariancePct,
    forecastDelayDays,
    lowStockCount: lowStockItems.length,
    alerts,
  };
}
