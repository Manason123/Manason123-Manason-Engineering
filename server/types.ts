export type UserRole = 'owner' | 'pm' | 'engineer' | 'storekeeper' | 'accountant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  projectIds: string[];
  active: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  createdAt: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  projectIds: string[];
  active: boolean;
  createdAt: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: UserRole;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  currency: string;
  contractValue: number;
  baselineBudget: number;
  baselineFrozen: boolean;
  baselineFrozenAt: string | null;
  startDate: string;
  plannedEndDate: string;
  physicalProgress: number;
  plannedProgress: number;
  status: 'active' | 'at_risk' | 'completed';
}

export interface BoqItem {
  id: string;
  projectId: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
  completedQty: number;
}

export interface VariationOrder {
  id: string;
  projectId: string;
  reference: string;
  title: string;
  reason: string;
  amount: number;
  scheduleImpactDays: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportDate: string;
  weather: 'Clear' | 'Cloudy' | 'Rain' | 'Heavy Rain';
  workforceCount: number;
  progressDelta: number;
  summary: string;
  blockers: string;
  submittedBy: string;
  status: 'submitted' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewNote: string;
  createdAt: string;
}

export interface MaterialItem {
  id: string;
  projectId: string;
  sku: string;
  name: string;
  unit: string;
  unitCost: number;
  stockOnHand: number;
  reorderLevel: number;
  consumedTotal: number;
}

export type ProcurementStage =
  | 'requested'
  | 'po_issued'
  | 'delivered'
  | 'confirmed'
  | 'issued'
  | 'consumed';

export interface MaterialOrder {
  id: string;
  projectId: string;
  materialId: string;
  reference: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  stage: ProcurementStage;
  requestedBy: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  projectId: string;
  date: string;
  type: 'committed' | 'actual' | 'cash_paid' | 'cash_received' | 'reversal';
  category: string;
  reference: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'reversed';
  createdBy: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  projectId: string | null;
  details: string;
}

export interface ProjectMetrics {
  projectId: string;
  contractValue: number;
  revisedContractValue: number;
  baselineBudget: number;
  approvedVariations: number;
  pendingVariations: number;
  revisedBudget: number;
  committedCost: number;
  actualCost: number;
  cashPaid: number;
  cashReceived: number;
  netCashPosition: number;
  estimatedFinalCost: number;
  budgetVariance: number;
  projectedMargin: number;
  projectedMarginPct: number;
  scheduleVariancePct: number;
  forecastDelayDays: number;
  lowStockCount: number;
  alerts: Array<{
    severity: 'warning' | 'critical';
    code: string;
    message: string;
  }>;
}
