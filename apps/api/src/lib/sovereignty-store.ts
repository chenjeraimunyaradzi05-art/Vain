import fs from 'fs';
import path from 'path';

export const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'sovereignty-store.json');

type ConsentRecord = {
  analyticsSharing: boolean;
  researchParticipation: boolean;
  communityDataBenefit: boolean;
  marketingCommunications: boolean;
  thirdPartySharing: boolean;
  updatedAt: string | null;
};

type ExportStatus = 'pending' | 'processing' | 'complete' | 'failed';

type ExportRecord = {
  id: string;
  userId: string;
  format: string;
  includeFiles: boolean;
  status: ExportStatus;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  exportData: unknown;
  errorMessage: string | null;
};

type DeletionRecord = Record<string, unknown>;

type AuditEntry = Record<string, unknown> & {
  createdAt?: string;
};

type StoreData = {
  consents: Record<string, ConsentRecord>;
  exports: Record<string, ExportRecord>;
  deletions: Record<string, DeletionRecord>;
  audit: AuditEntry[];
};

function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ consents: {}, exports: {}, deletions: {}, audit: [] }, null, 2)
    );
  }
}

function readStore(): StoreData {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw || '{}') as StoreData;
  } catch {
    return { consents: {}, exports: {}, deletions: {}, audit: [] };
  }
}

function writeStore(next: StoreData) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2));
}

export function pushAudit(entry: AuditEntry) {
  const store = readStore();
  store.audit = Array.isArray(store.audit) ? store.audit : [];
  store.audit.push({ ...entry, createdAt: new Date().toISOString() });
  writeStore(store);
}

export function getConsent(userId: string): ConsentRecord | null {
  const store = readStore();
  return store.consents?.[userId] || null;
}

export function upsertConsent(userId: string, consentPatch: Partial<ConsentRecord>): ConsentRecord {
  const store = readStore();
  store.consents = store.consents || {};
  const current = store.consents[userId] || {
    analyticsSharing: false,
    researchParticipation: false,
    communityDataBenefit: false,
    marketingCommunications: false,
    thirdPartySharing: false,
    updatedAt: null,
  };

  const next = {
    ...current,
    ...consentPatch,
    updatedAt: new Date().toISOString(),
  };

  store.consents[userId] = next;
  writeStore(store);
  return next;
}

export function createExportRequest({
  exportId,
  userId,
  format,
  includeFiles,
}: {
  exportId: string;
  userId: string;
  format: string;
  includeFiles?: boolean;
}): ExportRecord {
  const store = readStore();
  store.exports = store.exports || {};
  store.exports[exportId] = {
    id: exportId,
    userId,
    format,
    includeFiles: Boolean(includeFiles),
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
    downloadUrl: null,
    expiresAt: null,
    exportData: null,
    errorMessage: null,
  };
  writeStore(store);
  return store.exports[exportId];
}

export function findInProgressExport(userId: string): ExportRecord | null {
  const store = readStore();
  const exportsMap = store.exports || {};
  return (
    Object.values(exportsMap).find(
      (e) => e.userId === userId && ['pending', 'processing'].includes(e.status)
    ) || null
  );
}

export function getExport(exportId: string): ExportRecord | null {
  const store = readStore();
  return store.exports?.[exportId] || null;
}

export function updateExport(exportId: string, patch: Partial<ExportRecord>): ExportRecord | null {
  const store = readStore();
  if (!store.exports?.[exportId]) return null;
  store.exports[exportId] = { ...store.exports[exportId], ...patch };
  writeStore(store);
  return store.exports[exportId];
}

export function getDeletionRequest(userId: string): DeletionRecord | null {
  const store = readStore();
  return store.deletions?.[userId] || null;
}

export function upsertDeletionRequest(userId: string, patch: DeletionRecord): DeletionRecord {
  const store = readStore();
  store.deletions = store.deletions || {};
  const current = store.deletions[userId] || null;
  store.deletions[userId] = { ...(current || {}), ...patch };
  writeStore(store);
  return store.deletions[userId];
}

export default {
  pushAudit,
  getConsent,
  upsertConsent,
  createExportRequest,
  findInProgressExport,
  getExport,
  updateExport,
  getDeletionRequest,
  upsertDeletionRequest,
  STORE_PATH,
};
