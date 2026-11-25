import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AccessRequest,
  AuditEntry,
  BoqItem,
  DailyReport,
  LedgerEntry,
  MaterialItem,
  MaterialOrder,
  Project,
  SafeUser,
  User,
  VariationOrder,
} from './types.ts';

export interface AppDatabase {
  users: User[];
  accessRequests: AccessRequest[];
  projects: Project[];
  boqItems: BoqItem[];
  variations: VariationOrder[];
  reports: DailyReport[];
  materials: MaterialItem[];
  orders: MaterialOrder[];
  ledger: LedgerEntry[];
  auditLog: AuditEntry[];
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    projectIds: user.projectIds,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function buildSeedDatabase(): AppDatabase {
  const demoHash = bcrypt.hashSync('Demo12345', 10);
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = process.env.ADMIN_NAME || 'Company Owner';

  const users: User[] = [
    {
      id: 'u-owner',
      name: 'Jean-Paul Manason',
      email: 'owner@buildtrack.rw',
      role: 'owner',
      passwordHash: demoHash,
      projectIds: ['p-kigali', 'p-musanze'],
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-10T08:00:00.000Z',
    },
    ...(adminEmail && adminEmail !== 'owner@buildtrack.rw'
      ? [
          {
            id: 'u-admin',
            name: adminName,
            email: adminEmail,
            role: 'owner' as const,
            passwordHash: adminPassword ? bcrypt.hashSync(adminPassword, 10) : demoHash,
            projectIds: ['p-kigali', 'p-musanze'],
            active: true,
            failedAttempts: 0,
            lockedUntil: null,
            createdAt: '2026-01-10T08:00:00.000Z',
          },
        ]
      : []),
    {
      id: 'u-pm',
      name: 'Diane Uwimana',
      email: 'pm@buildtrack.rw',
      role: 'pm',
      passwordHash: demoHash,
      projectIds: ['p-kigali', 'p-musanze'],
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-12T08:00:00.000Z',
    },
    {
      id: 'u-eng',
      name: 'Eric Niyonzima',
      email: 'engineer@buildtrack.rw',
      role: 'engineer',
      passwordHash: demoHash,
      projectIds: ['p-kigali', 'p-musanze'],
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-15T08:00:00.000Z',
    },
    {
      id: 'u-store',
      name: 'Claude Habimana',
      email: 'store@buildtrack.rw',
      role: 'storekeeper',
      passwordHash: demoHash,
      projectIds: ['p-kigali', 'p-musanze'],
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-18T08:00:00.000Z',
    },
    {
      id: 'u-acc',
      name: 'Solange Mukamana',
      email: 'accountant@buildtrack.rw',
      role: 'accountant',
      passwordHash: demoHash,
      projectIds: ['p-kigali', 'p-musanze'],
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-20T08:00:00.000Z',
    },
  ];

  const projects: Project[] = [
    {
      id: 'p-kigali',
      code: 'ME-2026-01',
      name: 'Kigali Logistics & Cold Storage Hub',
      client: 'Rwanda Freight & Agro Authority',
      location: 'Kigali Special Economic Zone',
      currency: 'RWF',
      contractValue: 485000000,
      baselineBudget: 392000000,
      baselineFrozen: true,
      baselineFrozenAt: '2026-02-01T09:00:00.000Z',
      startDate: '2026-02-01',
      plannedEndDate: '2026-12-15',
      physicalProgress: 64,
      plannedProgress: 61,
      status: 'active',
    },
    {
      id: 'p-musanze',
      code: 'ME-2026-02',
      name: 'Musanze Regional Waterline & Pump Station',
      client: 'WASAC Northern Operations',
      location: 'Musanze District',
      currency: 'RWF',
      contractValue: 310000000,
      baselineBudget: 254000000,
      baselineFrozen: true,
      baselineFrozenAt: '2026-03-05T10:30:00.000Z',
      startDate: '2026-03-01',
      plannedEndDate: '2026-11-30',
      physicalProgress: 42,
      plannedProgress: 56,
      status: 'at_risk',
    },
  ];

  const boqItems: BoqItem[] = [
    {
      id: 'b-1',
      projectId: 'p-kigali',
      code: '01.10',
      category: 'Substructure',
      description: 'Excavation, blinding & reinforced foundation pads',
      unit: 'm3',
      quantity: 820,
      unitRate: 145000,
      completedQty: 820,
    },
    {
      id: 'b-2',
      projectId: 'p-kigali',
      code: '02.20',
      category: 'Superstructure',
      description: 'Structural steel portal frames & mezzanine decking',
      unit: 'ton',
      quantity: 95,
      unitRate: 1620000,
      completedQty: 74,
    },
    {
      id: 'b-3',
      projectId: 'p-kigali',
      code: '03.15',
      category: 'Envelope & Insulated Panels',
      description: 'PIR cold-room insulated wall & roof cladding',
      unit: 'm2',
      quantity: 2400,
      unitRate: 49667,
      completedQty: 960,
    },
    {
      id: 'b-4',
      projectId: 'p-musanze',
      code: '01.05',
      category: 'Trenching & Bedding',
      description: 'Rock excavation & granular pipe bedding (12 km)',
      unit: 'm',
      quantity: 12000,
      unitRate: 7800,
      completedQty: 6100,
    },
    {
      id: 'b-5',
      projectId: 'p-musanze',
      code: '02.10',
      category: 'Pipeline Supply & Laying',
      description: 'DN250 HDPE PN16 main transmission pipework',
      unit: 'm',
      quantity: 12000,
      unitRate: 9200,
      completedQty: 4800,
    },
    {
      id: 'b-6',
      projectId: 'p-musanze',
      code: '04.01',
      category: 'Pump House Civil & MEP',
      description: 'Booster station RC reservoir & dual pump skid',
      unit: 'ls',
      quantity: 1,
      unitRate: 50000000,
      completedQty: 0.35,
    },
  ];

  const variations: VariationOrder[] = [
    {
      id: 'v-1',
      projectId: 'p-kigali',
      reference: 'VO-KGL-001',
      title: 'Loading dock hydraulic levelers (4 bays)',
      reason: 'Client operational upgrade for refrigerated 40ft trailers',
      amount: 24500000,
      scheduleImpactDays: 6,
      status: 'approved',
      requestedBy: 'Diane Uwimana',
      approvedBy: 'Jean-Paul Manason',
      createdAt: '2026-06-14T11:00:00.000Z',
    },
    {
      id: 'v-2',
      projectId: 'p-musanze',
      reference: 'VO-MSZ-001',
      title: 'Basalt rock blasting along Sector 4 ridge',
      reason: 'Unforeseen hard-rock stratum encountered over 1.8 km',
      amount: 28000000,
      scheduleImpactDays: 18,
      status: 'approved',
      requestedBy: 'Eric Niyonzima',
      approvedBy: 'Jean-Paul Manason',
      createdAt: '2026-07-02T09:15:00.000Z',
    },
    {
      id: 'v-3',
      projectId: 'p-musanze',
      reference: 'VO-MSZ-002',
      title: 'Backup solar-hybrid inverter bank for pump house',
      reason: 'Grid voltage stabilization request from WASAC',
      amount: 16400000,
      scheduleImpactDays: 10,
      status: 'pending',
      requestedBy: 'Diane Uwimana',
      approvedBy: null,
      createdAt: '2026-11-18T14:20:00.000Z',
    },
  ];

  const reports: DailyReport[] = [
    {
      id: 'r-1',
      projectId: 'p-kigali',
      reportDate: '2026-11-23',
      weather: 'Clear',
      workforceCount: 44,
      progressDelta: 1.5,
      summary: 'Completed Bay 3 & 4 cold-room roof panel fastening and floor joint sealing.',
      blockers: '',
      submittedBy: 'Eric Niyonzima',
      status: 'approved',
      reviewedBy: 'Diane Uwimana',
      reviewNote: 'Verified against weekly QA checklist.',
      createdAt: '2026-11-23T17:30:00.000Z',
    },
    {
      id: 'r-2',
      projectId: 'p-kigali',
      reportDate: '2026-11-24',
      weather: 'Cloudy',
      workforceCount: 46,
      progressDelta: 1.2,
      summary: 'Installed refrigeration evaporator hangers in Zone B; electrical conduit rough-in 80%.',
      blockers: 'Awaiting insulated door frame gaskets on next store issue.',
      submittedBy: 'Eric Niyonzima',
      status: 'submitted',
      reviewedBy: null,
      reviewNote: '',
      createdAt: '2026-11-24T17:45:00.000Z',
    },
    {
      id: 'r-3',
      projectId: 'p-musanze',
      reportDate: '2026-11-23',
      weather: 'Heavy Rain',
      workforceCount: 28,
      progressDelta: 0.4,
      summary: 'Dewatered pump house foundation pit; butt-fused 180 m of DN250 HDPE.',
      blockers: 'Heavy afternoon rain slowed trench backfilling at km 6.4.',
      submittedBy: 'Eric Niyonzima',
      status: 'approved',
      reviewedBy: 'Diane Uwimana',
      reviewNote: 'Rain delay logged for extension of time record.',
      createdAt: '2026-11-23T18:05:00.000Z',
    },
  ];

  const materials: MaterialItem[] = [
    {
      id: 'm-1',
      projectId: 'p-kigali',
      sku: 'MAT-CEM-42',
      name: 'Portland Cement 42.5N (50 kg bag)',
      unit: 'bag',
      unitCost: 11800,
      stockOnHand: 420,
      reorderLevel: 200,
      consumedTotal: 3180,
    },
    {
      id: 'm-2',
      projectId: 'p-kigali',
      sku: 'MAT-PIR-100',
      name: 'Insulated PIR Cold-Room Panel 100mm',
      unit: 'm2',
      unitCost: 42000,
      stockOnHand: 185,
      reorderLevel: 250,
      consumedTotal: 960,
    },
    {
      id: 'm-3',
      projectId: 'p-musanze',
      sku: 'MAT-HDPE-250',
      name: 'HDPE DN250 PN16 Pipe (12m length)',
      unit: 'length',
      unitCost: 108000,
      stockOnHand: 34,
      reorderLevel: 80,
      consumedTotal: 400,
    },
    {
      id: 'm-4',
      projectId: 'p-musanze',
      sku: 'MAT-REB-16',
      name: 'High-Tensile Rebar Y16 (12m bar)',
      unit: 'bar',
      unitCost: 14500,
      stockOnHand: 190,
      reorderLevel: 100,
      consumedTotal: 540,
    },
  ];

  const orders: MaterialOrder[] = [
    {
      id: 'o-1',
      projectId: 'p-kigali',
      materialId: 'm-2',
      reference: 'PO-KGL-104',
      supplier: 'East Africa ColdChain Supply',
      quantity: 450,
      unitPrice: 42000,
      stage: 'po_issued',
      requestedBy: 'Eric Niyonzima',
      updatedAt: '2026-11-22T10:00:00.000Z',
    },
    {
      id: 'o-2',
      projectId: 'p-kigali',
      materialId: 'm-1',
      reference: 'PO-KGL-105',
      supplier: 'CIMERWA Kigali Depot',
      quantity: 300,
      unitPrice: 11800,
      stage: 'delivered',
      requestedBy: 'Claude Habimana',
      updatedAt: '2026-11-24T08:30:00.000Z',
    },
    {
      id: 'o-3',
      projectId: 'p-musanze',
      materialId: 'm-3',
      reference: 'PO-MSZ-089',
      supplier: 'Rwanda Pipe & Fittings Ltd',
      quantity: 120,
      unitPrice: 108000,
      stage: 'requested',
      requestedBy: 'Eric Niyonzima',
      updatedAt: '2026-11-24T11:15:00.000Z',
    },
  ];

  const ledger: LedgerEntry[] = [
    {
      id: 'l-1',
      projectId: 'p-kigali',
      date: '2026-04-15',
      type: 'cash_received',
      category: 'Client IPC',
      reference: 'IPC-KGL-01',
      description: 'Advance & Interim Payment Certificate #1',
      amount: 165000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-2',
      projectId: 'p-kigali',
      date: '2026-08-20',
      type: 'cash_received',
      category: 'Client IPC',
      reference: 'IPC-KGL-02',
      description: 'Interim Payment Certificate #2 (Steel frame milestone)',
      amount: 120000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-3',
      projectId: 'p-kigali',
      date: '2026-09-10',
      type: 'actual',
      category: 'Subcontract & Structural Steel',
      reference: 'INV-STL-412',
      description: 'Portal frame fabrication & erection certified',
      amount: 148000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-4',
      projectId: 'p-kigali',
      date: '2026-10-05',
      type: 'actual',
      category: 'Materials & Site Labor',
      reference: 'COST-KGL-10',
      description: 'Concrete, cement, formwork & site payroll through Oct',
      amount: 104000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-5',
      projectId: 'p-kigali',
      date: '2026-10-12',
      type: 'cash_paid',
      category: 'Supplier Disbursement',
      reference: 'PAY-KGL-21',
      description: 'Wire settlement to steel fabricator & CIMERWA',
      amount: 221000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-6',
      projectId: 'p-kigali',
      date: '2026-11-18',
      type: 'committed',
      category: 'MEP Subcontract',
      reference: 'SUB-MEP-09',
      description: 'Committed refrigeration plant installation contract',
      amount: 46000000,
      status: 'approved',
      createdBy: 'Diane Uwimana',
    },
    {
      id: 'l-7',
      projectId: 'p-musanze',
      date: '2026-05-02',
      type: 'cash_received',
      category: 'Client IPC',
      reference: 'IPC-MSZ-01',
      description: 'Mobilization advance & trenching IPC #1',
      amount: 112000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-8',
      projectId: 'p-musanze',
      date: '2026-10-18',
      type: 'actual',
      category: 'Rock Excavation & Pipe Supply',
      reference: 'COST-MSZ-18',
      description: 'Blasting crews, dewatering & HDPE pipe deliveries',
      amount: 146000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-9',
      projectId: 'p-musanze',
      date: '2026-10-25',
      type: 'cash_paid',
      category: 'Supplier & Crew Payroll',
      reference: 'PAY-MSZ-14',
      description: 'Payments to blasting subcontractor & pipe supplier',
      amount: 129000000,
      status: 'approved',
      createdBy: 'Solange Mukamana',
    },
    {
      id: 'l-10',
      projectId: 'p-musanze',
      date: '2026-11-21',
      type: 'cash_paid',
      category: 'Pump Equipment Deposit',
      reference: 'PAY-MSZ-19',
      description: '40% deposit for dual booster pump skid (pending approval)',
      amount: 18500000,
      status: 'pending',
      createdBy: 'Solange Mukamana',
    },
  ];

  const accessRequests: AccessRequest[] = [
    {
      id: 'ar-1',
      name: 'Patrick Mugisha',
      email: 'p.mugisha@manason.rw',
      requestedRole: 'engineer',
      note: 'Assigned as assistant site engineer for Musanze Sector 4 pipeline.',
      status: 'pending',
      createdAt: '2026-11-24T09:40:00.000Z',
    },
  ];

  const auditLog: AuditEntry[] = [
    {
      id: 'a-1',
      timestamp: '2026-11-24T17:45:00.000Z',
      actorId: 'u-eng',
      actorName: 'Eric Niyonzima',
      actorRole: 'engineer',
      action: 'REPORT_SUBMITTED',
      entity: 'DailyReport:r-2',
      projectId: 'p-kigali',
      details: 'Submitted daily site report for 2026-11-24 (46 workers, +1.2% progress).',
    },
    {
      id: 'a-2',
      timestamp: '2026-11-24T11:15:00.000Z',
      actorId: 'u-eng',
      actorName: 'Eric Niyonzima',
      actorRole: 'engineer',
      action: 'MATERIAL_REQUESTED',
      entity: 'MaterialOrder:o-3',
      projectId: 'p-musanze',
      details: 'Requested 120 lengths of HDPE DN250 PN16 Pipe.',
    },
    {
      id: 'a-3',
      timestamp: '2026-11-21T15:10:00.000Z',
      actorId: 'u-acc',
      actorName: 'Solange Mukamana',
      actorRole: 'accountant',
      action: 'PAYMENT_QUEUED',
      entity: 'LedgerEntry:l-10',
      projectId: 'p-musanze',
      details: 'Queued 18,500,000 RWF deposit for booster pump skid.',
    },
  ];

  return {
    users,
    accessRequests,
    projects,
    boqItems,
    variations,
    reports,
    materials,
    orders,
    ledger,
    auditLog,
  };
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : '';
const snapshotPath = dataDir ? path.join(dataDir, 'buildtrack-state.json') : '';

function loadDatabase(): AppDatabase {
  if (snapshotPath && fs.existsSync(snapshotPath)) {
    try {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      return JSON.parse(raw) as AppDatabase;
    } catch {
      // Fallback to fresh seed if snapshot is unreadable
    }
  }
  return buildSeedDatabase();
}

export const db: AppDatabase = loadDatabase();

export function persistDatabase(): void {
  if (!snapshotPath) return;
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Ephemeral container fallback: keep running in memory
  }
}

export function appendAudit(
  actor: SafeUser,
  action: string,
  entity: string,
  projectId: string | null,
  details: string
): void {
  db.auditLog.unshift({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entity,
    projectId,
    details,
  });
  if (db.auditLog.length > 250) {
    db.auditLog.length = 250;
  }
  persistDatabase();
}
