import bcrypt from 'bcryptjs';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { computeProjectMetrics } from './server/engine.ts';
import { appendAudit, db, persistDatabase, sanitizeUser } from './server/store.ts';
import type { ProcurementStage, SafeUser, UserRole } from './server/types.ts';

interface AuthRequest extends Request {
  user?: SafeUser;
}

const PORT = 3000;
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

if (process.env.CORS_ORIGIN) {
  const allowed = process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
}

function isMoneyHidden(role: UserRole): boolean {
  return role === 'storekeeper';
}

function signToken(user: SafeUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    const found = db.users.find((u) => u.id === decoded.sub && u.active);
    if (!found) {
      res.status(401).json({ error: 'Account inactive or not found' });
      return;
    }
    req.user = sanitizeUser(found);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}

function hasProjectAccess(user: SafeUser, projectId: string): boolean {
  if (user.role === 'owner') return true;
  return user.projectIds.includes(projectId);
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'buildtrack-pro', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !user.active) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    res.status(423).json({ error: `Account temporarily locked. Try again in ${mins} minute(s).` });
    return;
  }

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = Date.now() + 15 * 60 * 1000;
      user.failedAttempts = 0;
    }
    persistDatabase();
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  user.failedAttempts = 0;
  user.lockedUntil = null;
  const safe = sanitizeUser(user);
  appendAudit(safe, 'LOGIN', `User:${safe.id}`, null, `${safe.name} signed in.`);
  res.json({ token: signToken(safe), user: safe });
});

app.post('/api/auth/request-access', (req: Request, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const requestedRole = String(req.body?.requestedRole || 'engineer') as UserRole;
  const note = String(req.body?.note || '').trim();

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const allowedRoles: UserRole[] = ['pm', 'engineer', 'storekeeper', 'accountant'];
  const role: UserRole = allowedRoles.includes(requestedRole) ? requestedRole : 'engineer';

  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const request = {
    id: `ar-${Date.now()}`,
    name,
    email,
    requestedRole: role,
    note,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };
  db.accessRequests.unshift(request);
  persistDatabase();
  res.status(201).json(request);
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Workspace bootstrap payload
app.get('/api/workspace', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const hideMoney = isMoneyHidden(user.role);

  const visibleProjects = db.projects.filter((p) => hasProjectAccess(user, p.id));
  const projectIds = new Set(visibleProjects.map((p) => p.id));

  const projects = visibleProjects.map((p) => {
    const metrics = computeProjectMetrics(
      p,
      db.boqItems,
      db.variations,
      db.materials,
      db.orders,
      db.ledger
    );
    return {
      ...p,
      contractValue: hideMoney ? 0 : p.contractValue,
      baselineBudget: hideMoney ? 0 : p.baselineBudget,
      metrics: hideMoney
        ? {
            ...metrics,
            contractValue: 0,
            revisedContractValue: 0,
            baselineBudget: 0,
            approvedVariations: 0,
            pendingVariations: 0,
            revisedBudget: 0,
            committedCost: 0,
            actualCost: 0,
            cashPaid: 0,
            cashReceived: 0,
            netCashPosition: 0,
            estimatedFinalCost: 0,
            budgetVariance: 0,
            projectedMargin: 0,
            projectedMarginPct: 0,
            alerts: metrics.alerts.filter((a) => a.code !== 'BUDGET_OVERRUN' && a.code !== 'NEGATIVE_CASHFLOW'),
          }
        : metrics,
    };
  });

  const boqItems = db.boqItems
    .filter((b) => projectIds.has(b.projectId))
    .map((b) => (hideMoney ? { ...b, unitRate: 0 } : b));

  const variations = hideMoney
    ? []
    : db.variations.filter((v) => projectIds.has(v.projectId));

  const reports = db.reports.filter((r) => projectIds.has(r.projectId));

  const materials = db.materials
    .filter((m) => projectIds.has(m.projectId))
    .map((m) => (hideMoney ? { ...m, unitCost: 0 } : m));

  const orders = db.orders
    .filter((o) => projectIds.has(o.projectId))
    .map((o) => (hideMoney ? { ...o, unitPrice: 0 } : o));

  const ledger = hideMoney
    ? []
    : db.ledger.filter((l) => projectIds.has(l.projectId));

  const users = user.role === 'owner' || user.role === 'pm' ? db.users.map(sanitizeUser) : [];
  const accessRequests = user.role === 'owner' ? db.accessRequests : [];
  const auditLog =
    user.role === 'owner' || user.role === 'pm' || user.role === 'accountant'
      ? db.auditLog.slice(0, 60)
      : [];

  res.json({
    user,
    hideMoney,
    projects,
    boqItems,
    variations,
    reports,
    materials,
    orders,
    ledger,
    users,
    accessRequests,
    auditLog,
  });
});

// Create project (Owner or PM)
app.post('/api/projects', requireAuth, requireRoles('owner', 'pm'), (req: AuthRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const code = String(req.body?.code || '').trim() || `ME-2026-0${db.projects.length + 1}`;
  const client = String(req.body?.client || '').trim() || 'Private Client';
  const location = String(req.body?.location || '').trim() || 'Kigali';
  const contractValue = Math.max(0, Number(req.body?.contractValue) || 0);
  const baselineBudget = Math.max(0, Number(req.body?.baselineBudget) || 0);
  const startDate = String(req.body?.startDate || new Date().toISOString().slice(0, 10));
  const plannedEndDate = String(req.body?.plannedEndDate || '2027-06-30');

  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  const project = {
    id: `p-${Date.now()}`,
    code,
    name,
    client,
    location,
    currency: 'RWF',
    contractValue,
    baselineBudget,
    baselineFrozen: false,
    baselineFrozenAt: null,
    startDate,
    plannedEndDate,
    physicalProgress: 0,
    plannedProgress: 0,
    status: 'active' as const,
  };
  db.projects.push(project);
  for (const u of db.users) {
    if (u.role === 'owner' || u.id === req.user!.id) {
      if (!u.projectIds.includes(project.id)) u.projectIds.push(project.id);
    }
  }
  appendAudit(req.user!, 'PROJECT_CREATED', `Project:${project.id}`, project.id, `Created project ${project.name}.`);
  res.status(201).json(project);
});

// BOQ Item creation
app.post('/api/boq', requireAuth, requireRoles('owner', 'pm', 'engineer'), (req: AuthRequest, res: Response) => {
  const projectId = String(req.body?.projectId || '');
  if (!hasProjectAccess(req.user!, projectId)) {
    res.status(403).json({ error: 'No access to project' });
    return;
  }
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  if (project.baselineFrozen) {
    res.status(409).json({ error: 'Baseline is frozen. Submit a Variation Order instead.' });
    return;
  }

  const item = {
    id: `b-${Date.now()}`,
    projectId,
    code: String(req.body?.code || '01.00').trim(),
    category: String(req.body?.category || 'General Works').trim(),
    description: String(req.body?.description || '').trim(),
    unit: String(req.body?.unit || 'ls').trim(),
    quantity: Math.max(0, Number(req.body?.quantity) || 0),
    unitRate: Math.max(0, Number(req.body?.unitRate) || 0),
    completedQty: 0,
  };
  if (!item.description) {
    res.status(400).json({ error: 'BOQ description is required' });
    return;
  }
  db.boqItems.push(item);
  project.baselineBudget = db.boqItems
    .filter((b) => b.projectId === project.id)
    .reduce((sum, b) => sum + b.quantity * b.unitRate, 0);
  appendAudit(req.user!, 'BOQ_ADDED', `BoqItem:${item.id}`, projectId, `Added BOQ item ${item.code} - ${item.description}.`);
  res.status(201).json(item);
});

// Freeze Baseline
app.post('/api/projects/:id/freeze-baseline', requireAuth, requireRoles('owner', 'pm'), (req: AuthRequest, res: Response) => {
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  project.baselineFrozen = true;
  project.baselineFrozenAt = new Date().toISOString();
  appendAudit(req.user!, 'BASELINE_FROZEN', `Project:${project.id}`, project.id, `Froze baseline budget for ${project.name}.`);
  res.json(project);
});

// Variation Orders
app.post('/api/variations', requireAuth, requireRoles('owner', 'pm', 'engineer'), (req: AuthRequest, res: Response) => {
  const projectId = String(req.body?.projectId || '');
  if (!hasProjectAccess(req.user!, projectId)) {
    res.status(403).json({ error: 'No access to project' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const amount = Number(req.body?.amount) || 0;
  const scheduleImpactDays = Number(req.body?.scheduleImpactDays) || 0;
  if (!title) {
    res.status(400).json({ error: 'Variation title is required' });
    return;
  }
  const count = db.variations.filter((v) => v.projectId === projectId).length + 1;
  const variation = {
    id: `v-${Date.now()}`,
    projectId,
    reference: `VO-${String(count).padStart(3, '0')}`,
    title,
    reason,
    amount,
    scheduleImpactDays,
    status: 'pending' as const,
    requestedBy: req.user!.name,
    approvedBy: null,
    createdAt: new Date().toISOString(),
  };
  db.variations.unshift(variation);
  appendAudit(req.user!, 'VARIATION_REQUESTED', `Variation:${variation.id}`, projectId, `Submitted ${variation.reference}: ${title}.`);
  res.status(201).json(variation);
});

app.post('/api/variations/:id/decide', requireAuth, requireRoles('owner', 'pm'), (req: AuthRequest, res: Response) => {
  const variation = db.variations.find((v) => v.id === req.params.id);
  if (!variation) {
    res.status(404).json({ error: 'Variation not found' });
    return;
  }
  const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
  variation.status = decision;
  variation.approvedBy = req.user!.name;
  appendAudit(req.user!, `VARIATION_${decision.toUpperCase()}`, `Variation:${variation.id}`, variation.projectId, `${decision} ${variation.reference} (${variation.amount.toLocaleString()} RWF).`);
  res.json(variation);
});

// Daily Site Reports
app.post('/api/reports', requireAuth, requireRoles('owner', 'pm', 'engineer'), (req: AuthRequest, res: Response) => {
  const projectId = String(req.body?.projectId || '');
  const reportDate = String(req.body?.reportDate || new Date().toISOString().slice(0, 10));
  if (!hasProjectAccess(req.user!, projectId)) {
    res.status(403).json({ error: 'No access to project' });
    return;
  }
  const duplicate = db.reports.some(
    (r) => r.projectId === projectId && r.reportDate === reportDate && r.status !== 'rejected'
  );
  if (duplicate) {
    res.status(409).json({ error: `A daily site report for ${reportDate} already exists on this project.` });
    return;
  }
  const summary = String(req.body?.summary || '').trim();
  if (!summary) {
    res.status(400).json({ error: 'Work summary is required' });
    return;
  }
  const report = {
    id: `r-${Date.now()}`,
    projectId,
    reportDate,
    weather: (req.body?.weather || 'Clear') as 'Clear' | 'Cloudy' | 'Rain' | 'Heavy Rain',
    workforceCount: Math.max(0, Number(req.body?.workforceCount) || 0),
    progressDelta: Math.max(0, Math.min(25, Number(req.body?.progressDelta) || 0)),
    summary,
    blockers: String(req.body?.blockers || '').trim(),
    submittedBy: req.user!.name,
    status: 'submitted' as const,
    reviewedBy: null,
    reviewNote: '',
    createdAt: new Date().toISOString(),
  };
  db.reports.unshift(report);
  appendAudit(req.user!, 'REPORT_SUBMITTED', `DailyReport:${report.id}`, projectId, `Submitted site report for ${reportDate}.`);
  res.status(201).json(report);
});

app.post('/api/reports/:id/decide', requireAuth, requireRoles('owner', 'pm'), (req: AuthRequest, res: Response) => {
  const report = db.reports.find((r) => r.id === req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  if (report.status !== 'submitted') {
    res.status(409).json({ error: 'Report has already been reviewed' });
    return;
  }
  const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
  report.status = decision;
  report.reviewedBy = req.user!.name;
  report.reviewNote = String(req.body?.reviewNote || '').trim();

  if (decision === 'approved') {
    const project = db.projects.find((p) => p.id === report.projectId);
    if (project) {
      project.physicalProgress = Math.min(100, Math.round((project.physicalProgress + report.progressDelta) * 10) / 10);
    }
  }
  appendAudit(req.user!, `REPORT_${decision.toUpperCase()}`, `DailyReport:${report.id}`, report.projectId, `${decision} site report for ${report.reportDate}.`);
  res.json(report);
});

// Materials & Procurement Chain: requested -> po_issued -> delivered -> confirmed -> issued -> consumed
const STAGE_ORDER: ProcurementStage[] = [
  'requested',
  'po_issued',
  'delivered',
  'confirmed',
  'issued',
  'consumed',
];

app.post('/api/materials/orders', requireAuth, requireRoles('owner', 'pm', 'engineer', 'storekeeper'), (req: AuthRequest, res: Response) => {
  const projectId = String(req.body?.projectId || '');
  const materialId = String(req.body?.materialId || '');
  const supplier = String(req.body?.supplier || '').trim() || 'Approved Vendor';
  const quantity = Math.max(1, Number(req.body?.quantity) || 0);

  if (!hasProjectAccess(req.user!, projectId)) {
    res.status(403).json({ error: 'No access to project' });
    return;
  }
  const mat = db.materials.find((m) => m.id === materialId && m.projectId === projectId);
  if (!mat) {
    res.status(404).json({ error: 'Material SKU not found for this project' });
    return;
  }
  const order = {
    id: `o-${Date.now()}`,
    projectId,
    materialId,
    reference: `REQ-${String(db.orders.length + 101)}`,
    supplier,
    quantity,
    unitPrice: mat.unitCost,
    stage: 'requested' as const,
    requestedBy: req.user!.name,
    updatedAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  appendAudit(req.user!, 'MATERIAL_REQUESTED', `MaterialOrder:${order.id}`, projectId, `Requested ${quantity} ${mat.unit} of ${mat.name}.`);
  res.status(201).json(isMoneyHidden(req.user!.role) ? { ...order, unitPrice: 0 } : order);
});

app.post('/api/materials/orders/:id/advance', requireAuth, requireRoles('owner', 'pm', 'storekeeper', 'accountant', 'engineer'), (req: AuthRequest, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Material order not found' });
    return;
  }
  const idx = STAGE_ORDER.indexOf(order.stage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) {
    res.status(409).json({ error: 'Order has already completed all procurement stages' });
    return;
  }
  const nextStage = STAGE_ORDER[idx + 1];
  const mat = db.materials.find((m) => m.id === order.materialId);

  if (nextStage === 'po_issued' && !['owner', 'pm', 'accountant'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Only Owner, PM, or Accountant can issue a Purchase Order' });
    return;
  }
  if ((nextStage === 'confirmed' || nextStage === 'issued') && !['owner', 'pm', 'storekeeper'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Only Storekeeper, PM, or Owner can confirm deliveries or issue stock' });
    return;
  }

  order.stage = nextStage;
  order.updatedAt = new Date().toISOString();

  if (nextStage === 'confirmed' && mat) {
    mat.stockOnHand += order.quantity;
    db.ledger.unshift({
      id: `l-${Date.now()}`,
      projectId: order.projectId,
      date: new Date().toISOString().slice(0, 10),
      type: 'actual',
      category: 'Materials Delivered',
      reference: order.reference,
      description: `Confirmed delivery: ${order.quantity} ${mat.unit} ${mat.name}`,
      amount: order.quantity * order.unitPrice,
      status: 'approved',
      createdBy: req.user!.name,
    });
  } else if (nextStage === 'issued' && mat) {
    mat.stockOnHand = Math.max(0, mat.stockOnHand - order.quantity);
  } else if (nextStage === 'consumed' && mat) {
    mat.consumedTotal += order.quantity;
  }

  appendAudit(req.user!, 'MATERIAL_STAGE_ADVANCED', `MaterialOrder:${order.id}`, order.projectId, `Moved ${order.reference} to stage: ${nextStage}.`);
  res.json(isMoneyHidden(req.user!.role) ? { ...order, unitPrice: 0 } : order);
});

// Financial Ledger (hidden from storekeeper)
app.post('/api/ledger', requireAuth, requireRoles('owner', 'pm', 'accountant'), (req: AuthRequest, res: Response) => {
  const projectId = String(req.body?.projectId || '');
  if (!hasProjectAccess(req.user!, projectId)) {
    res.status(403).json({ error: 'No access to project' });
    return;
  }
  const type = String(req.body?.type || 'cash_paid') as 'committed' | 'actual' | 'cash_paid' | 'cash_received';
  const amount = Math.max(1, Number(req.body?.amount) || 0);
  const category = String(req.body?.category || 'General Cost').trim();
  const description = String(req.body?.description || '').trim();
  const reference = String(req.body?.reference || `TX-${Date.now().toString().slice(-5)}`).trim();

  if (!description) {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const status = req.user!.role === 'owner' ? 'approved' : 'pending';
  const entry = {
    id: `l-${Date.now()}`,
    projectId,
    date: String(req.body?.date || new Date().toISOString().slice(0, 10)),
    type,
    category,
    reference,
    description,
    amount,
    status: status as 'approved' | 'pending',
    createdBy: req.user!.name,
  };
  db.ledger.unshift(entry);
  appendAudit(req.user!, 'LEDGER_CREATED', `LedgerEntry:${entry.id}`, projectId, `Logged ${type} ${amount.toLocaleString()} RWF (${reference}).`);
  res.status(201).json(entry);
});

app.post('/api/ledger/:id/approve', requireAuth, requireRoles('owner', 'accountant'), (req: AuthRequest, res: Response) => {
  const entry = db.ledger.find((l) => l.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Ledger entry not found' });
    return;
  }
  entry.status = 'approved';
  appendAudit(req.user!, 'PAYMENT_APPROVED', `LedgerEntry:${entry.id}`, entry.projectId, `Approved ${entry.reference} (${entry.amount.toLocaleString()} RWF).`);
  res.json(entry);
});

app.post('/api/ledger/:id/reverse', requireAuth, requireRoles('owner', 'accountant'), (req: AuthRequest, res: Response) => {
  const entry = db.ledger.find((l) => l.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Ledger entry not found' });
    return;
  }
  if (entry.status === 'reversed') {
    res.status(409).json({ error: 'Entry is already reversed' });
    return;
  }
  entry.status = 'reversed';
  appendAudit(req.user!, 'LEDGER_REVERSED', `LedgerEntry:${entry.id}`, entry.projectId, `Reversed ${entry.reference} (${entry.amount.toLocaleString()} RWF).`);
  res.json(entry);
});

// Team & Access Requests (Owner)
app.post('/api/users', requireAuth, requireRoles('owner'), (req: AuthRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = String(req.body?.role || 'engineer') as UserRole;
  const password = String(req.body?.password || 'Demo12345');
  const projectIds = Array.isArray(req.body?.projectIds)
    ? (req.body.projectIds as string[])
    : db.projects.map((p) => p.id);

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }
  const user = {
    id: `u-${Date.now()}`,
    name,
    email,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    projectIds,
    active: true,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  appendAudit(req.user!, 'USER_CREATED', `User:${user.id}`, null, `Created ${role} user ${email}.`);
  res.status(201).json(sanitizeUser(user));
});

app.post('/api/access-requests/:id/decide', requireAuth, requireRoles('owner'), (req: AuthRequest, res: Response) => {
  const request = db.accessRequests.find((a) => a.id === req.params.id);
  if (!request) {
    res.status(404).json({ error: 'Access request not found' });
    return;
  }
  const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
  request.status = decision;

  if (decision === 'approved' && !db.users.some((u) => u.email.toLowerCase() === request.email.toLowerCase())) {
    const assignedRole = (req.body?.role || request.requestedRole) as UserRole;
    const projectIds = Array.isArray(req.body?.projectIds)
      ? (req.body.projectIds as string[])
      : db.projects.map((p) => p.id);
    db.users.push({
      id: `u-${Date.now()}`,
      name: request.name,
      email: request.email,
      role: assignedRole,
      passwordHash: bcrypt.hashSync('Demo12345', 10),
      projectIds,
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
    });
  }
  appendAudit(req.user!, `ACCESS_REQUEST_${decision.toUpperCase()}`, `AccessRequest:${request.id}`, null, `${decision} access request for ${request.email}.`);
  res.json(request);
});

async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`BuildTrack Pro listening on http://${HOST}:${PORT}`);
  });
}

startServer();
