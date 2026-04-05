'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currency?: string;
  parentCode?: string;
};

type JournalEntry = {
  id: string;
  date: string;
  description?: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
};

type LedgerEntry = {
  id: string;
  date: string;
  account: string;
  debit: number;
  credit: number;
  memo?: string;
};

type TaxProfile = {
  id: string;
  name: string;
  jurisdiction: string;
  rates: Array<{ name: string; rate: number; inclusive: boolean }>;
};

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  uom: string;
  quantityOnHand: number;
  averageCost: number;
};

type BudgetPlan = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  categories: Array<{ name: string; limit: number; actual: number }>;
};

type TreeNode = {
  key: string;
  account?: ChartAccount;
  children: TreeNode[];
};

function TreeNodeView({
  node,
  depth,
  onEdit,
  onMove,
  onDragState,
}: {
  node: TreeNode;
  depth: number;
  onEdit: (account: ChartAccount) => void;
  onMove: (accountCode: string, parentCode?: string) => void;
  onDragState: (code: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const label = node.account?.code ?? node.key;
  const hasChildren = node.children.length > 0;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!node.account) return;
    event.dataTransfer.setData('text/plain', node.account.code);
    event.dataTransfer.effectAllowed = 'move';
    onDragState(node.account.code);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedCode = event.dataTransfer.getData('text/plain');
    if (!draggedCode) return;
    if (node.account?.code === draggedCode) return;
    const parentCode = node.account?.code;
    onMove(draggedCode, parentCode);
    onDragState(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between"
        style={{ paddingLeft: depth * 12 }}
        draggable={Boolean(node.account)}
        onDragStart={handleDragStart}
        onDragEnd={() => onDragState(null)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <button
              className="text-white/40"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              {open ? '▾' : '▸'}
            </button>
          )}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50">{node.account?.type || ''}</span>
          {node.account && (
            <button className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]" onClick={() => onEdit(node.account!)}>Edit</button>
          )}
        </div>
      </div>
      {open && node.children.map((child) => (
        <TreeNodeView key={child.key} node={child} depth={depth + 1} onEdit={onEdit} onMove={onMove} onDragState={onDragState} />
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetPlan[]>([]);
  const [report, setReport] = useState<any>(null);
  const [taxReport, setTaxReport] = useState<any>(null);
  const [settings, setSettings] = useState<{ valuationMethod: string; defaultCurrency: string } | null>(null);
  const [taxReturn, setTaxReturn] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'ASSET', parentCode: '' });
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
  });
  const [taxProfileForm, setTaxProfileForm] = useState({ name: '', jurisdiction: '', rate: '', inclusive: false });
  const [inventoryForm, setInventoryForm] = useState({ sku: '', name: '', uom: 'EA' });
  const [inventoryTxnForm, setInventoryTxnForm] = useState({ sku: '', type: 'IN', quantity: '', unitCost: '' });
  const [budgetForm, setBudgetForm] = useState({ name: '', start: '', end: '', category: '', limit: '' });
  const [taxReportForm, setTaxReportForm] = useState({ from: '', to: '' });
  const [settingsForm, setSettingsForm] = useState({ valuationMethod: 'FIFO', defaultCurrency: 'AUD' });
  const [closingForm, setClosingForm] = useState({ from: '', to: '', date: '' });
  const [taxReturnForm, setTaxReturnForm] = useState({ from: '', to: '' });
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: '', endDate: '' });

  const topLedger = useMemo(() => ledger.slice(0, 12), [ledger]);
  const chartTree = useMemo(() => {
    type TreeNode = { key: string; account?: ChartAccount; children: TreeNode[] };
    const nodeMap = new Map<string, TreeNode>();

    const getNode = (key: string) => {
      const existing = nodeMap.get(key);
      if (existing) return existing;
      const created: TreeNode = { key, children: [] };
      nodeMap.set(key, created);
      return created;
    };

    const addChild = (parent: TreeNode, child: TreeNode) => {
      if (!parent.children.includes(child)) {
        parent.children.push(child);
      }
    };

    const roots = new Set<TreeNode>();

    // Create nodes
    for (const account of chart) {
      const node = getNode(account.code);
      node.account = account;
    }

    // Link nodes (prefer explicit parentCode)
    for (const account of chart) {
      const node = getNode(account.code);
      if (account.parentCode) {
        const parent = getNode(account.parentCode);
        addChild(parent, node);
        continue;
      }

      if (account.code.includes(':')) {
        const parentKey = account.code.split(':').slice(0, -1).join(':');
        const parent = getNode(parentKey);
        addChild(parent, node);
      } else {
        roots.add(node);
      }
    }

    // Add any orphaned nodes as roots
    for (const node of nodeMap.values()) {
      if (!node.account?.parentCode && !node.key.includes(':')) {
        roots.add(node);
      }
    }

    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.key.localeCompare(b.key));
      nodes.forEach((node) => sortTree(node.children));
    };

    const rootList = Array.from(roots);
    sortTree(rootList);
    return rootList;
  }, [chart]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [chartRes, journalRes, ledgerRes, taxRes, inventoryRes, budgetsRes, settingsRes, periodsRes] = await Promise.all([
        api('/finance/chart'),
        api('/finance/journals'),
        api('/finance/ledger'),
        api('/finance/tax/profiles'),
        api('/finance/inventory/items'),
        api('/finance/budgets'),
        api('/finance/settings'),
        api('/finance/periods'),
      ]);

      if (chartRes.ok) setChart(chartRes.data?.chart || []);
      if (journalRes.ok) setJournals(journalRes.data?.journals || []);
      if (ledgerRes.ok) setLedger(ledgerRes.data?.entries || []);
      if (taxRes.ok) setTaxProfiles(taxRes.data?.profiles || []);
      if (inventoryRes.ok) setInventory(inventoryRes.data?.items || []);
      if (budgetsRes.ok) setBudgets(budgetsRes.data?.budgets || []);
      if (settingsRes.ok) {
        setSettings(settingsRes.data?.settings || null);
        if (settingsRes.data?.settings) {
          setSettingsForm(settingsRes.data.settings);
        }
      }
      if (periodsRes.ok) setPeriods(periodsRes.data?.periods || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load finance data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSeedChart() {
    const res = await api('/finance/chart/seed', { method: 'POST' });
    if (res.ok) setChart(res.data?.chart || []);
  }

  async function handleCreateAccount() {
    const payload = {
      ...accountForm,
      parentCode: accountForm.parentCode || undefined,
    };
    const res = await api('/finance/chart', { method: 'POST', body: payload });
    if (res.ok) {
      setAccountForm({ code: '', name: '', type: 'ASSET', parentCode: '' });
      setEditingAccount(null);
      loadAll();
    }
  }

  async function handleMoveAccount(accountCode: string, parentCode?: string) {
    const account = chart.find((item) => item.code === accountCode);
    if (!account) return;
    const res = await api('/finance/chart', {
      method: 'POST',
      body: {
        code: account.code,
        name: account.name,
        type: account.type,
        parentCode: parentCode || undefined,
      },
    });
    if (res.ok) {
      loadAll();
    }
  }

  function handleEditAccount(account: ChartAccount) {
    setEditingAccount(account.code);
    setAccountForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parentCode: account.parentCode || '',
    });
  }

  function handleCancelEdit() {
    setEditingAccount(null);
    setAccountForm({ code: '', name: '', type: 'ASSET', parentCode: '' });
  }

  async function handleCreateJournal() {
    const amount = Number(journalForm.amount || 0);
    const res = await api('/finance/journals', {
      method: 'POST',
      body: {
        date: new Date(journalForm.date).toISOString(),
        description: journalForm.description,
        lines: [
          { account: journalForm.debitAccount, debit: amount, credit: 0 },
          { account: journalForm.creditAccount, debit: 0, credit: amount },
        ],
      },
    });
    if (res.ok) {
      setJournalForm({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        debitAccount: '',
        creditAccount: '',
        amount: '',
      });
      loadAll();
    }
  }

  async function handleCreateTaxProfile() {
    const res = await api('/finance/tax/profiles', {
      method: 'POST',
      body: {
        name: taxProfileForm.name,
        jurisdiction: taxProfileForm.jurisdiction,
        rates: [
          {
            name: 'Standard',
            rate: Number(taxProfileForm.rate || 0),
            inclusive: taxProfileForm.inclusive,
          },
        ],
      },
    });
    if (res.ok) {
      setTaxProfileForm({ name: '', jurisdiction: '', rate: '', inclusive: false });
      loadAll();
    }
  }

  async function handleCreateInventoryItem() {
    const res = await api('/finance/inventory/items', {
      method: 'POST',
      body: { ...inventoryForm },
    });
    if (res.ok) {
      setInventoryForm({ sku: '', name: '', uom: 'EA' });
      loadAll();
    }
  }

  async function handleInventoryTransaction() {
    const res = await api('/finance/inventory/transactions', {
      method: 'POST',
      body: {
        sku: inventoryTxnForm.sku,
        type: inventoryTxnForm.type,
        quantity: Number(inventoryTxnForm.quantity || 0),
        unitCost: inventoryTxnForm.unitCost ? Number(inventoryTxnForm.unitCost) : undefined,
        date: new Date().toISOString(),
      },
    });
    if (res.ok) {
      setInventoryTxnForm({ sku: '', type: 'IN', quantity: '', unitCost: '' });
      loadAll();
    }
  }

  async function handleCreateBudget() {
    const res = await api('/finance/budgets', {
      method: 'POST',
      body: {
        name: budgetForm.name || 'New Budget',
        currency: 'AUD',
        periodStart: new Date(budgetForm.start).toISOString(),
        periodEnd: new Date(budgetForm.end).toISOString(),
        categories: [{ name: budgetForm.category, limit: Number(budgetForm.limit || 0) }],
      },
    });
    if (res.ok) {
      setBudgetForm({ name: '', start: '', end: '', category: '', limit: '' });
      loadAll();
    }
  }

  async function handleReport(type: 'PL' | 'BS' | 'CF' | 'TB') {
    const res = await api(`/finance/reports/${type}?currency=AUD`);
    if (res.ok) setReport(res.data?.report || null);
  }

  async function handleTaxReport() {
    const params = new URLSearchParams();
    if (taxReportForm.from) params.set('from', new Date(taxReportForm.from).toISOString());
    if (taxReportForm.to) params.set('to', new Date(taxReportForm.to).toISOString());
    const res = await api(`/finance/tax/report?${params.toString()}`);
    if (res.ok) setTaxReport(res.data || null);
  }

  async function handleTaxReturn() {
    const params = new URLSearchParams();
    if (taxReturnForm.from) params.set('from', new Date(taxReturnForm.from).toISOString());
    if (taxReturnForm.to) params.set('to', new Date(taxReturnForm.to).toISOString());
    const res = await api(`/finance/tax/return?${params.toString()}`);
    if (res.ok) setTaxReturn(res.data?.taxReturn || null);
  }

  async function handleInventoryReport() {
    const res = await api('/finance/inventory/report');
    if (res.ok) setInventoryReport(res.data?.report || null);
  }

  async function handleCreatePeriod() {
    const res = await api('/finance/periods', {
      method: 'POST',
      body: {
        name: periodForm.name,
        startDate: new Date(periodForm.startDate).toISOString(),
        endDate: new Date(periodForm.endDate).toISOString(),
      },
    });
    if (res.ok) {
      setPeriodForm({ name: '', startDate: '', endDate: '' });
      loadAll();
    }
  }

  async function handleClosePeriod(periodId: string) {
    const res = await api(`/finance/periods/${periodId}/close`, { method: 'POST' });
    if (res.ok) loadAll();
  }

  async function handleUpdateSettings() {
    const res = await api('/finance/settings', {
      method: 'PATCH',
      body: settingsForm,
    });
    if (res.ok) setSettings(res.data?.settings || null);
  }

  async function handleCreateClosingEntry() {
    const res = await api('/finance/close-period', {
      method: 'POST',
      body: {
        from: closingForm.from ? new Date(closingForm.from).toISOString() : undefined,
        to: closingForm.to ? new Date(closingForm.to).toISOString() : undefined,
        date: closingForm.date ? new Date(closingForm.date).toISOString() : new Date().toISOString(),
      },
    });
    if (res.ok) {
      loadAll();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-8 text-white">Loading finance workspace...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 text-white">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold">Finance Workspace</h1>
        <p className="mt-2 text-sm text-white/70">
          Journals, ledgers, tax profiles, inventory, budgets, and financial reports.
        </p>
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Chart of Accounts</h2>
          <p className="mt-1 text-sm text-white/60">Seed defaults or add custom accounts.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={handleSeedChart}>Seed defaults</button>
          </div>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Code (Asset:Cash)" value={accountForm.code} onChange={(e) => setAccountForm((prev) => ({ ...prev, code: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Name" value={accountForm.name} onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Parent code (optional)" value={accountForm.parentCode} onChange={(e) => setAccountForm((prev) => ({ ...prev, parentCode: e.target.value }))} />
            <select className="rounded-lg bg-white/5 px-3 py-2" value={accountForm.type} onChange={(e) => setAccountForm((prev) => ({ ...prev, type: e.target.value }))}>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateAccount}>
                {editingAccount ? 'Update account' : 'Save account'}
              </button>
              {editingAccount && (
                <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={handleCancelEdit}>Cancel</button>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {chartTree.map((node) => (
              <div key={node.key} className="rounded-xl bg-white/5 p-3">
                <TreeNodeView node={node} depth={0} onEdit={handleEditAccount} onMove={handleMoveAccount} onDragState={setDraggingCode} />
              </div>
            ))}
          </div>
          {draggingCode && (
            <p className="mt-3 text-xs text-white/50">Dragging {draggingCode}. Drop onto a parent account to reassign.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Post Journal Entry</h2>
          <p className="mt-1 text-sm text-white/60">Record double-entry journals.</p>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={journalForm.date} onChange={(e) => setJournalForm((prev) => ({ ...prev, date: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Description" value={journalForm.description} onChange={(e) => setJournalForm((prev) => ({ ...prev, description: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Debit account" value={journalForm.debitAccount} onChange={(e) => setJournalForm((prev) => ({ ...prev, debitAccount: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Credit account" value={journalForm.creditAccount} onChange={(e) => setJournalForm((prev) => ({ ...prev, creditAccount: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Amount" value={journalForm.amount} onChange={(e) => setJournalForm((prev) => ({ ...prev, amount: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateJournal}>Post journal</button>
          </div>
          <div className="mt-4 text-sm text-white/70">
            Recent journals: {journals.length}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Tax Profiles</h2>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Profile name" value={taxProfileForm.name} onChange={(e) => setTaxProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Jurisdiction (AU, NZ, etc)" value={taxProfileForm.jurisdiction} onChange={(e) => setTaxProfileForm((prev) => ({ ...prev, jurisdiction: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Rate %" value={taxProfileForm.rate} onChange={(e) => setTaxProfileForm((prev) => ({ ...prev, rate: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={taxProfileForm.inclusive} onChange={(e) => setTaxProfileForm((prev) => ({ ...prev, inclusive: e.target.checked }))} />
              Inclusive tax
            </label>
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateTaxProfile}>Create profile</button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {taxProfiles.map((profile) => (
              <li key={profile.id}>
                {profile.name} · {profile.jurisdiction} · {profile.rates[0]?.rate}%
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="SKU" value={inventoryForm.sku} onChange={(e) => setInventoryForm((prev) => ({ ...prev, sku: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Item name" value={inventoryForm.name} onChange={(e) => setInventoryForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="UOM" value={inventoryForm.uom} onChange={(e) => setInventoryForm((prev) => ({ ...prev, uom: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateInventoryItem}>Add item</button>
          </div>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="SKU" value={inventoryTxnForm.sku} onChange={(e) => setInventoryTxnForm((prev) => ({ ...prev, sku: e.target.value }))} />
            <select className="rounded-lg bg-white/5 px-3 py-2" value={inventoryTxnForm.type} onChange={(e) => setInventoryTxnForm((prev) => ({ ...prev, type: e.target.value }))}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUST">ADJUST</option>
            </select>
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Quantity" value={inventoryTxnForm.quantity} onChange={(e) => setInventoryTxnForm((prev) => ({ ...prev, quantity: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Unit cost (IN only)" value={inventoryTxnForm.unitCost} onChange={(e) => setInventoryTxnForm((prev) => ({ ...prev, unitCost: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleInventoryTransaction}>Post transaction</button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {inventory.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.sku} · {item.name}</span>
                <span className="text-white/50">{item.quantityOnHand}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Finance Settings</h2>
          <p className="mt-1 text-sm text-white/60">Set inventory valuation and defaults.</p>
          <div className="mt-4 grid gap-3">
            <select className="rounded-lg bg-white/5 px-3 py-2" value={settingsForm.valuationMethod} onChange={(e) => setSettingsForm((prev) => ({ ...prev, valuationMethod: e.target.value }))}>
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="AVG">Average Cost</option>
            </select>
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Default currency" value={settingsForm.defaultCurrency} onChange={(e) => setSettingsForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleUpdateSettings}>Save settings</button>
            {settings && (
              <p className="text-xs text-white/60">Current: {settings.valuationMethod} · {settings.defaultCurrency}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Close Period</h2>
          <p className="mt-1 text-sm text-white/60">Roll income/expense into retained earnings.</p>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={closingForm.from} onChange={(e) => setClosingForm((prev) => ({ ...prev, from: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={closingForm.to} onChange={(e) => setClosingForm((prev) => ({ ...prev, to: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={closingForm.date} onChange={(e) => setClosingForm((prev) => ({ ...prev, date: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateClosingEntry}>Create closing entry</button>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Budgets</h2>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Budget name" value={budgetForm.name} onChange={(e) => setBudgetForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={budgetForm.start} onChange={(e) => setBudgetForm((prev) => ({ ...prev, start: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={budgetForm.end} onChange={(e) => setBudgetForm((prev) => ({ ...prev, end: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Category" value={budgetForm.category} onChange={(e) => setBudgetForm((prev) => ({ ...prev, category: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Limit" value={budgetForm.limit} onChange={(e) => setBudgetForm((prev) => ({ ...prev, limit: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreateBudget}>Create budget</button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {budgets.map((budget) => (
              <li key={budget.id}>{budget.name} · {budget.categories.length} categories</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Financial Reports</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={() => handleReport('PL')}>P&amp;L</button>
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={() => handleReport('BS')}>Balance Sheet</button>
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={() => handleReport('CF')}>Cashflow</button>
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={() => handleReport('TB')}>Trial Balance</button>
          </div>
          {report && (
            <div className="mt-4 rounded-xl bg-black/30 p-4 text-xs text-white/70">
              <pre className="whitespace-pre-wrap">{JSON.stringify(report.data, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
        <h2 className="text-lg font-semibold">Tax Report</h2>
        <p className="mt-1 text-sm text-white/60">Aggregate taxable amounts by tax category and profile.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={taxReportForm.from} onChange={(e) => setTaxReportForm((prev) => ({ ...prev, from: e.target.value }))} />
          <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={taxReportForm.to} onChange={(e) => setTaxReportForm((prev) => ({ ...prev, to: e.target.value }))} />
          <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleTaxReport}>Generate tax report</button>
        </div>
        {taxReport && (
          <div className="mt-4 rounded-xl bg-black/30 p-4 text-xs text-white/70">
            <pre className="whitespace-pre-wrap">{JSON.stringify(taxReport.report, null, 2)}</pre>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Tax Return (GST/VAT)</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={taxReturnForm.from} onChange={(e) => setTaxReturnForm((prev) => ({ ...prev, from: e.target.value }))} />
            <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={taxReturnForm.to} onChange={(e) => setTaxReturnForm((prev) => ({ ...prev, to: e.target.value }))} />
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleTaxReturn}>Generate return</button>
          </div>
          {taxReturn && (
            <div className="mt-4 rounded-xl bg-black/30 p-4 text-xs text-white/70">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-[10px] uppercase text-white/40">Taxable sales</div>
                  <div className="text-sm">{taxReturn.totalTaxable?.toFixed?.(2) ?? taxReturn.totalTaxable}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-[10px] uppercase text-white/40">Tax payable</div>
                  <div className="text-sm">{taxReturn.totalTax?.toFixed?.(2) ?? taxReturn.totalTax}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-[10px] uppercase text-white/40">Jurisdiction</div>
                  <div className="text-sm">{taxReturn.jurisdiction || '—'}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[10px] uppercase text-white/40">Category breakdown</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-white/40">
                      <tr>
                        <th className="py-1">Category</th>
                        <th className="py-1">Rate</th>
                        <th className="py-1">Taxable</th>
                        <th className="py-1">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(taxReturn.lines || []).map((line: any) => (
                        <tr key={line.category} className="border-t border-white/5">
                          <td className="py-1">{line.category}</td>
                          <td className="py-1">{line.rate}%</td>
                          <td className="py-1">{line.taxableAmount}</td>
                          <td className="py-1">{line.taxAmount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
          <h2 className="text-lg font-semibold">Inventory Valuation</h2>
          <p className="mt-1 text-sm text-white/60">Compute inventory value using the active valuation method.</p>
          <div className="mt-4">
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleInventoryReport}>Generate report</button>
          </div>
          {inventoryReport && (
            <div className="mt-4 rounded-xl bg-black/30 p-4 text-xs text-white/70">
              <pre className="whitespace-pre-wrap">{JSON.stringify(inventoryReport, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
        <h2 className="text-lg font-semibold">Finance Periods</h2>
        <p className="mt-1 text-sm text-white/60">Create periods and lock them after closing.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="rounded-lg bg-white/5 px-3 py-2" placeholder="Name" value={periodForm.name} onChange={(e) => setPeriodForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm((prev) => ({ ...prev, startDate: e.target.value }))} />
          <input className="rounded-lg bg-white/5 px-3 py-2" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm((prev) => ({ ...prev, endDate: e.target.value }))} />
          <button className="rounded-full bg-white/15 px-4 py-2 text-sm" onClick={handleCreatePeriod}>Create period</button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-white/70">
          {periods.map((period) => (
            <li key={period.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{period.name} · {period.startDate.slice(0, 10)} → {period.endDate.slice(0, 10)}</span>
              <span className="text-white/50">{period.status}</span>
              {period.status === 'OPEN' && (
                <button className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={() => handleClosePeriod(period.id)}>Close</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
        <h2 className="text-lg font-semibold">Recent Ledger Entries</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Account</th>
                <th className="py-2">Debit</th>
                <th className="py-2">Credit</th>
                <th className="py-2">Memo</th>
              </tr>
            </thead>
            <tbody>
              {topLedger.map((entry) => (
                <tr key={entry.id} className="border-t border-white/5">
                  <td className="py-2">{entry.date.slice(0, 10)}</td>
                  <td className="py-2">{entry.account}</td>
                  <td className="py-2">{entry.debit.toFixed(2)}</td>
                  <td className="py-2">{entry.credit.toFixed(2)}</td>
                  <td className="py-2">{entry.memo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}