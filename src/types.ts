import type {
  AccessRequest,
  AuditEntry,
  BoqItem,
  DailyReport,
  LedgerEntry,
  MaterialItem,
  MaterialOrder,
  Project,
  ProjectMetrics,
  SafeUser,
  VariationOrder,
} from '../server/types.ts';

export interface ProjectWithMetrics extends Project {
  metrics: ProjectMetrics;
}

export interface WorkspacePayload {
  user: SafeUser;
  hideMoney: boolean;
  projects: ProjectWithMetrics[];
  boqItems: BoqItem[];
  variations: VariationOrder[];
  reports: DailyReport[];
  materials: MaterialItem[];
  orders: MaterialOrder[];
  ledger: LedgerEntry[];
  users: SafeUser[];
  accessRequests: AccessRequest[];
  auditLog: AuditEntry[];
}
