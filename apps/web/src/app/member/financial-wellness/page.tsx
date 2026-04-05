'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
import { API_BASE } from '@/lib/apiBase';
import { getAccessToken } from '@/lib/tokenStore';
import {
  PiggyBank,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Calendar,
  Plus,
  RefreshCw,
  Download,
  Search,
  BookOpen,
  BadgeCheck,
  FileText,
} from 'lucide-react';

const DEFAULT_PERIOD = 'MONTHLY';

export default function FinancialWellnessPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'budget' | 'accounts' | 'debt' | 'grants'
  >('overview');
  interface BudgetCategory {
    id: string;
    name: string;
    type: string;
    limitAmount?: number;
  }
  interface Budget {
    id: string;
    name: string;
    period: string;
    categories?: BudgetCategory[];
  }
  interface AlertItem {
    message: string;
    severity?: string;
  }
  interface SummaryTotals {
    income?: number;
    expenses?: number;
    leftover?: number;
  }
  interface SummaryDebtItem {
    id?: string;
  }
  interface SummaryDebtSummary {
    total?: number;
    items?: SummaryDebtItem[];
  }
  interface Summary {
    alerts?: AlertItem[];
    budget?: Budget;
    totals?: SummaryTotals;
    debts?: SummaryDebtSummary;
  }
  interface InsightByMerchant {
    merchant: string;
    total: number;
  }
  interface InsightTransaction {
    id: string;
    name: string;
    amount: number;
  }
  interface Insights {
    byMerchant?: InsightByMerchant[];
    unusualTransactions?: InsightTransaction[];
  }
  interface DebtItem {
    id: string;
    lender: string;
    balance?: number;
    interestRate?: number;
    type?: string;
    strategy?: string;
  }
  interface DebtPlanItem {
    id: string;
    lender: string;
    estimatedMonths?: number;
  }
  interface DebtPlan {
    plan?: DebtPlanItem[];
  }
  interface SupportItem {
    name: string;
    url: string;
  }
  interface Resources {
    hardshipSupport?: SupportItem[];
    counseling?: SupportItem[];
  }

  const [summary, setSummary] = useState<Summary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [templates, setTemplates] = useState<Record<string, BudgetCategory[]> | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [debtPlan, setDebtPlan] = useState<DebtPlan | null>(null);
  const [resources, setResources] = useState<Resources | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [grants, setGrants] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [grantApplications, setGrantApplications] = useState<any[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<any[]>([]);
  const [grantTips, setGrantTips] = useState<string[]>([]);
  const [scholarshipPrep, setScholarshipPrep] = useState<string[]>([]);
  const [grantSearch, setGrantSearch] = useState('');
  const [grantFilters, setGrantFilters] = useState({ category: '', indigenous: true, women: true });
  const [grantEligibility, setGrantEligibility] = useState<Record<string, any>>({});

  const [budgetForm, setBudgetForm] = useState({
    name: '',
    period: DEFAULT_PERIOD,
    template: 'CUSTOM',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'EXPENSE', limitAmount: '' });
  const [entryForm, setEntryForm] = useState({
    type: 'EXPENSE',
    amount: '',
    categoryId: '',
    description: '',
    occurredAt: '',
  });
  const [accountForm, setAccountForm] = useState({ provider: 'PLAID', name: '' });
  const [debtForm, setDebtForm] = useState({
    type: 'OTHER',
    lender: '',
    balance: '',
    interestRate: '',
  });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '' });
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDate: '' });
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    amount: '',
    cadence: 'MONTHLY',
  });
  const [importForm, setImportForm] = useState({ budgetId: '', categoryId: '' });
  const [shareForm, setShareForm] = useState({ memberId: '', role: 'VIEWER' });

  const currentBudget = useMemo(() => budgets[0] || summary?.budget, [budgets, summary]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [
        summaryRes,
        budgetRes,
        templateRes,
        accountRes,
        txRes,
        debtRes,
        goalRes,
        billRes,
        subscriptionRes,
        insightsRes,
        debtPlanRes,
        resourcesRes,
      ] = await Promise.all([
        api('/financial/summary'),
        api('/financial/budgets'),
        api('/financial/templates'),
        api('/financial/accounts'),
        api('/financial/transactions?limit=25'),
        api('/financial/debts'),
        api('/financial/goals'),
        api('/financial/bills'),
        api('/financial/subscriptions'),
        api('/financial/insights'),
        api('/financial/debts/plan?strategy=SNOWBALL&extraPayment=0'),
        api('/financial/resources'),
      ]);

      if (summaryRes.ok) setSummary(summaryRes.data);
      if (budgetRes.ok) setBudgets(budgetRes.data?.budgets || []);
      if (templateRes.ok) setTemplates(templateRes.data?.templates || null);
      if (accountRes.ok) {
        setAccounts(accountRes.data?.accounts || []);
        setConnections(accountRes.data?.connections || []);
      }
      if (txRes.ok) setTransactions(txRes.data?.transactions || []);
      if (debtRes.ok) setDebts(debtRes.data?.debts || []);
      if (goalRes.ok) setGoals(goalRes.data?.goals || []);
      if (billRes.ok) setBills(billRes.data?.bills || []);
      if (subscriptionRes.ok) setSubscriptions(subscriptionRes.data?.subscriptions || []);
      if (insightsRes.ok) setInsights(insightsRes.data || null);
      if (debtPlanRes.ok) setDebtPlan(debtPlanRes.data || null);
      if (resourcesRes.ok) setResources(resourcesRes.data || null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load financial wellness data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'grants') {
      loadGrants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadGrants() {
    try {
      const query = new URLSearchParams();
      if (grantSearch) query.set('q', grantSearch);
      if (grantFilters.category) query.set('category', grantFilters.category);
      if (grantFilters.indigenous) query.set('indigenous', 'true');
      if (grantFilters.women) query.set('women', 'true');

      const [grantsRes, scholarshipsRes, grantAppsRes, scholarshipAppsRes, tipsRes, prepRes] =
        await Promise.all([
          api(`/financial/grants?${query.toString()}`),
          api(`/financial/scholarships?${query.toString()}`),
          api('/financial/grants/applications'),
          api('/financial/scholarships/applications'),
          api('/financial/grants/writing-tips'),
          api('/financial/scholarships/interview-prep'),
        ]);

      if (grantsRes.ok) setGrants(grantsRes.data?.grants || []);
      if (scholarshipsRes.ok) setScholarships(scholarshipsRes.data?.scholarships || []);
      if (grantAppsRes.ok) setGrantApplications(grantAppsRes.data?.applications || []);
      if (scholarshipAppsRes.ok)
        setScholarshipApplications(scholarshipAppsRes.data?.applications || []);
      if (tipsRes.ok) setGrantTips(tipsRes.data?.tips || []);
      if (prepRes.ok) setScholarshipPrep(prepRes.data?.prep || []);
    } catch (err) {
      // ignore for now
    }
  }

  async function handleGrantEligibility(grantId: string) {
    const res = await api(`/financial/grants/${grantId}/eligibility`, {
      method: 'POST',
      body: { isIndigenous: true, isWoman: true },
    });
    if (res.ok) {
      setGrantEligibility((prev) => ({ ...prev, [grantId]: res.data }));
    }
  }

  async function handleApplyGrant(grantId: string) {
    const res = await api('/financial/grants/applications', {
      method: 'POST',
      body: { grantId, status: 'DRAFT' },
    });
    if (res.ok) {
      loadGrants();
    }
  }

  async function handleApplyScholarship(scholarshipId: string) {
    const res = await api('/financial/scholarships/applications', {
      method: 'POST',
      body: { scholarshipId, status: 'SUBMITTED' },
    });
    if (res.ok) {
      loadGrants();
    }
  }

  async function handleCreateBudget() {
    const templateCategories =
      budgetForm.template === 'FIFTY_THIRTY_TWENTY'
        ? templates?.fiftyThirtyTwenty
        : budgetForm.template === 'ZERO_BASED'
          ? templates?.zeroBased
          : [];

    const res = await api('/financial/budgets', {
      method: 'POST',
      body: {
        name: budgetForm.name || 'My Budget',
        period: budgetForm.period,
        template: budgetForm.template,
        categories: templateCategories?.map((cat: BudgetCategory) => ({
          name: cat.name,
          type: cat.type,
        })),
      },
    });

    if (res.ok) {
      setBudgetForm({ name: '', period: DEFAULT_PERIOD, template: 'CUSTOM' });
      loadAll();
    }
  }

  async function handleAddCategory() {
    if (!currentBudget?.id) return;
    const res = await api(`/financial/budgets/${currentBudget.id}/categories`, {
      method: 'POST',
      body: {
        name: categoryForm.name,
        type: categoryForm.type,
        limitAmount: categoryForm.limitAmount ? Number(categoryForm.limitAmount) : null,
      },
    });
    if (res.ok) {
      setCategoryForm({ name: '', type: 'EXPENSE', limitAmount: '' });
      loadAll();
    }
  }

  async function handleAddEntry() {
    if (!currentBudget?.id) return;
    const res = await api(`/financial/budgets/${currentBudget.id}/entries`, {
      method: 'POST',
      body: {
        type: entryForm.type,
        amount: Number(entryForm.amount || 0),
        categoryId: entryForm.categoryId || null,
        description: entryForm.description,
        occurredAt: entryForm.occurredAt || undefined,
      },
    });
    if (res.ok) {
      setEntryForm({
        type: 'EXPENSE',
        amount: '',
        categoryId: '',
        description: '',
        occurredAt: '',
      });
      loadAll();
    }
  }

  async function handleConnectAccount() {
    const res = await api('/financial/accounts/connect', {
      method: 'POST',
      body: { provider: accountForm.provider, name: accountForm.name || 'Everyday Account' },
    });
    if (res.ok) {
      setAccountForm({ provider: 'PLAID', name: '' });
      loadAll();
    }
  }

  async function handleAddDebt() {
    const res = await api('/financial/debts', {
      method: 'POST',
      body: {
        type: debtForm.type,
        lender: debtForm.lender,
        balance: Number(debtForm.balance || 0),
        interestRate: debtForm.interestRate ? Number(debtForm.interestRate) : null,
      },
    });
    if (res.ok) {
      setDebtForm({ type: 'OTHER', lender: '', balance: '', interestRate: '' });
      loadAll();
    }
  }

  async function handleAddGoal() {
    const res = await api('/financial/goals', {
      method: 'POST',
      body: { name: goalForm.name, targetAmount: Number(goalForm.targetAmount || 0) },
    });
    if (res.ok) {
      setGoalForm({ name: '', targetAmount: '' });
      loadAll();
    }
  }

  async function handleAddBill() {
    const res = await api('/financial/bills', {
      method: 'POST',
      body: {
        name: billForm.name,
        amount: Number(billForm.amount || 0),
        dueDate: billForm.dueDate || new Date().toISOString(),
      },
    });
    if (res.ok) {
      setBillForm({ name: '', amount: '', dueDate: '' });
      loadAll();
    }
  }

  async function handleAddSubscription() {
    const res = await api('/financial/subscriptions', {
      method: 'POST',
      body: {
        name: subscriptionForm.name,
        amount: Number(subscriptionForm.amount || 0),
        cadence: subscriptionForm.cadence,
      },
    });
    if (res.ok) {
      setSubscriptionForm({ name: '', amount: '', cadence: 'MONTHLY' });
      loadAll();
    }
  }

  async function handleImportTransactions() {
    if (!importForm.budgetId) return;
    const res = await api('/financial/transactions/import', {
      method: 'POST',
      body: {
        budgetId: importForm.budgetId,
        categoryId: importForm.categoryId || null,
        transactionIds: transactions.slice(0, 10).map((tx) => tx.id),
      },
    });
    if (res.ok) {
      loadAll();
    }
  }

  async function handleShareBudget() {
    if (!currentBudget?.id || !shareForm.memberId) return;
    const res = await api(`/financial/budgets/${currentBudget.id}/share`, {
      method: 'POST',
      body: { memberId: shareForm.memberId, role: shareForm.role },
    });
    if (res.ok) {
      setShareForm({ memberId: '', role: 'VIEWER' });
    }
  }

  async function handleExport(type: 'budget' | 'transactions' | 'debts') {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}/financial/export?type=${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-white flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-3">
                <PiggyBank className="w-7 h-7 text-emerald-400" />
                Financial Wellness
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Build budgets, track expenses, connect accounts, and map your debt payoff journey.
              </p>
              {summary?.alerts?.length ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {summary.alerts.map((alert: AlertItem, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-200 flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {alert.message}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport('budget')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Budget
              </button>
              <button
                onClick={() => handleExport('transactions')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Transactions
              </button>
              <button
                onClick={() => handleExport('debts')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Debts
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Income</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-400">
              {summary?.totals?.income?.toFixed?.(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">This period</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Expenses</p>
            <p className="text-2xl font-semibold mt-1 text-rose-400">
              {summary?.totals?.expenses?.toFixed?.(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">This period</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Leftover</p>
            <p className="text-2xl font-semibold mt-1 text-blue-300">
              {summary?.totals?.leftover?.toFixed?.(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">After expenses</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Debt Balance</p>
            <p className="text-2xl font-semibold mt-1 text-amber-300">
              {summary?.debts?.total?.toFixed?.(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Across {summary?.debts?.items?.length || 0} accounts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'budget', label: 'Budget', icon: Wallet },
            { id: 'accounts', label: 'Accounts', icon: CreditCard },
            { id: 'debt', label: 'Debt', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-400" /> Savings Goals
              </h3>
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="rounded-lg bg-slate-800/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <span className="text-xs text-slate-400">
                        {Number(goal.currentAmount || 0).toFixed(2)} /{' '}
                        {Number(goal.targetAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full mt-2">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.min(100, (Number(goal.currentAmount || 0) / Math.max(1, Number(goal.targetAmount || 1))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {goals.length === 0 && <p className="text-sm text-slate-500">No goals yet.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Goal name"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                />
                <input
                  className="w-28 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Target"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                />
                <button
                  onClick={handleAddGoal}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Upcoming Bills
              </h3>
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{bill.name}</p>
                      <p className="text-xs text-slate-400">
                        Due {new Date(bill.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm text-slate-300">
                      {Number(bill.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                {bills.length === 0 && <p className="text-sm text-slate-500">No upcoming bills.</p>}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Bill name"
                  value={billForm.name}
                  onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Amount"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                />
                <input
                  type="date"
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                />
                <button
                  onClick={handleAddBill}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Add Bill
                </button>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" /> Subscriptions
              </h3>
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-slate-400">{sub.cadence}</p>
                    </div>
                    <span className="text-sm text-slate-300">
                      {Number(sub.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <p className="text-sm text-slate-500">No subscriptions yet.</p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Subscription name"
                  value={subscriptionForm.name}
                  onChange={(e) =>
                    setSubscriptionForm({ ...subscriptionForm, name: e.target.value })
                  }
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Amount"
                  value={subscriptionForm.amount}
                  onChange={(e) =>
                    setSubscriptionForm({ ...subscriptionForm, amount: e.target.value })
                  }
                />
                <select
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={subscriptionForm.cadence}
                  onChange={(e) =>
                    setSubscriptionForm({ ...subscriptionForm, cadence: e.target.value })
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                <button
                  onClick={handleAddSubscription}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Add Subscription
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Spending Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">Top merchants</p>
                  <div className="space-y-2">
                    {insights?.byMerchant?.length ? (
                      insights.byMerchant.map((item: InsightByMerchant) => (
                        <div
                          key={item.merchant}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-300">{item.merchant}</span>
                          <span className="text-slate-400">
                            {Number(item.total || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No merchant insights yet.</p>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">Unusual activity</p>
                  <div className="space-y-2">
                    {insights?.unusualTransactions?.length ? (
                      insights.unusualTransactions.map((tx: InsightTransaction) => (
                        <div key={tx.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{tx.name}</span>
                          <span className="text-amber-300">
                            {Number(tx.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No unusual activity detected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Budget Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Budget name"
                  value={budgetForm.name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                />
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={budgetForm.period}
                  onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={budgetForm.template}
                  onChange={(e) => setBudgetForm({ ...budgetForm, template: e.target.value })}
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="ZERO_BASED">Zero-based</option>
                  <option value="FIFTY_THIRTY_TWENTY">50/30/20</option>
                </select>
                <button
                  onClick={handleCreateBudget}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-sm flex items-center gap-2 justify-center"
                >
                  <Plus className="w-4 h-4" /> Create Budget
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Categories</h3>
                <div className="space-y-3">
                  {currentBudget?.categories?.map((cat: BudgetCategory) => (
                    <div
                      key={cat.id}
                      className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-slate-400">{cat.type}</p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {cat.limitAmount
                          ? `Limit: ${Number(cat.limitAmount).toFixed(2)}`
                          : 'No limit'}
                      </span>
                    </div>
                  ))}
                  {!currentBudget?.categories?.length && (
                    <p className="text-sm text-slate-500">No categories yet.</p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <input
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Category name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                  <select
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                  <input
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Limit (optional)"
                    value={categoryForm.limitAmount}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, limitAmount: e.target.value })
                    }
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-6 border-t border-slate-800 pt-4">
                  <p className="text-sm font-medium mb-2">Share budget (family mode)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                      placeholder="Member ID"
                      value={shareForm.memberId}
                      onChange={(e) => setShareForm({ ...shareForm, memberId: e.target.value })}
                    />
                    <select
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                      value={shareForm.role}
                      onChange={(e) => setShareForm({ ...shareForm, role: e.target.value })}
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <button
                      onClick={handleShareBudget}
                      className="col-span-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                    >
                      Share Budget
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Use a member ID from their profile.</p>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Add Entry</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={entryForm.type}
                    onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                  <input
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Amount"
                    value={entryForm.amount}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  />
                  <select
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={entryForm.categoryId}
                    onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {currentBudget?.categories?.map((cat: BudgetCategory) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    placeholder="Description"
                    value={entryForm.description}
                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  />
                  <input
                    type="date"
                    className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={entryForm.occurredAt}
                    onChange={(e) => setEntryForm({ ...entryForm, occurredAt: e.target.value })}
                  />
                  <button
                    onClick={handleAddEntry}
                    className="col-span-2 px-3 py-2 rounded-lg bg-emerald-600 text-sm flex items-center justify-center gap-2"
                  >
                    <ArrowDownRight className="w-4 h-4" /> Add Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{account.name || 'Bank Account'}</p>
                      <p className="text-xs text-slate-400">
                        •••• {account.mask || '0000'} · {account.provider}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{account.currency}</span>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-sm text-slate-500">No accounts connected.</p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <select
                  className="col-span-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={accountForm.provider}
                  onChange={(e) => setAccountForm({ ...accountForm, provider: e.target.value })}
                >
                  <option value="PLAID">Plaid</option>
                  <option value="BASIQ">Basiq</option>
                </select>
                <input
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Account name"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                />
                <button
                  onClick={handleConnectAccount}
                  className="col-span-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Connect Account
                </button>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                Connection health: {connections[0]?.status || 'Not connected'}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{tx.name}</p>
                      <p className="text-xs text-slate-400">
                        {tx.merchantName || 'General'} ·{' '}
                        {tx.postedAt ? new Date(tx.postedAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <span
                      className={`text-sm ${Number(tx.amount) >= 0 ? 'text-rose-300' : 'text-emerald-300'}`}
                    >
                      {Number(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-sm text-slate-500">No transactions loaded.</p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={importForm.budgetId}
                  onChange={(e) => setImportForm({ ...importForm, budgetId: e.target.value })}
                >
                  <option value="">Select budget</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name}
                    </option>
                  ))}
                </select>
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={importForm.categoryId}
                  onChange={(e) => setImportForm({ ...importForm, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {currentBudget?.categories?.map((cat: BudgetCategory) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleImportTransactions}
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  Import last 10 transactions
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Debt Accounts</h3>
              <div className="space-y-3">
                {debts.map((debt: DebtItem) => (
                  <div
                    key={debt.id}
                    className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{debt.lender}</p>
                      <p className="text-xs text-slate-400">
                        {debt.type} · {debt.strategy}
                      </p>
                    </div>
                    <span className="text-sm text-amber-300">
                      {Number(debt.balance || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                {debts.length === 0 && <p className="text-sm text-slate-500">No debts tracked.</p>}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Add Debt</h3>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  value={debtForm.type}
                  onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}
                >
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="LOAN">Loan</option>
                  <option value="BNPL">BNPL</option>
                  <option value="MORTGAGE">Mortgage</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Lender"
                  value={debtForm.lender}
                  onChange={(e) => setDebtForm({ ...debtForm, lender: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Balance"
                  value={debtForm.balance}
                  onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  placeholder="Interest %"
                  value={debtForm.interestRate}
                  onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })}
                />
                <button
                  onClick={handleAddDebt}
                  className="col-span-2 px-3 py-2 rounded-lg bg-amber-600 text-sm flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" /> Add Debt
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Payoff Strategy Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">Snowball plan</p>
                  <div className="space-y-2">
                    {debtPlan?.plan?.length ? (
                      debtPlan.plan.map((item: DebtPlanItem) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{item.lender}</span>
                          <span className="text-slate-400">
                            {item.estimatedMonths ? `${item.estimatedMonths} months` : 'N/A'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Add debts to see payoff timeline.</p>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">Support resources</p>
                  <div className="space-y-2">
                    {resources?.hardshipSupport?.map((item: SupportItem) => (
                      <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-emerald-300 hover:text-emerald-200 block"
                      >
                        {item.name}
                      </a>
                    ))}
                    {resources?.counseling?.map((item: SupportItem) => (
                      <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-slate-300 hover:text-white block"
                      >
                        {item.name}
                      </a>
                    ))}
                    {!resources && <p className="text-sm text-slate-500">Resources loading...</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grants' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-xs text-slate-400">Search</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                      placeholder="Search grants or scholarships"
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                    />
                    <button
                      onClick={loadGrants}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="min-w-[180px]">
                  <label className="text-xs text-slate-400">Category</label>
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                    value={grantFilters.category}
                    onChange={(e) => setGrantFilters({ ...grantFilters, category: e.target.value })}
                  >
                    <option value="">All</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="housing">Housing</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={grantFilters.indigenous}
                      onChange={(e) =>
                        setGrantFilters({ ...grantFilters, indigenous: e.target.checked })
                      }
                    />
                    Indigenous
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={grantFilters.women}
                      onChange={(e) =>
                        setGrantFilters({ ...grantFilters, women: e.target.checked })
                      }
                    />
                    Women
                  </label>
                  <button
                    onClick={loadGrants}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" /> Grants Directory
                </h3>
                <div className="space-y-3">
                  {grants.map((grant) => (
                    <div key={grant.id} className="rounded-lg bg-slate-800/60 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{grant.title}</p>
                          <p className="text-xs text-slate-400">{grant.provider}</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {grant.deadline
                            ? new Date(grant.deadline).toLocaleDateString()
                            : 'No deadline'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(grant.tags || []).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {grantEligibility[grant.id] && (
                        <div className="mt-2 text-xs text-slate-300">
                          {grantEligibility[grant.id].eligible ? (
                            <span className="text-emerald-300">Eligible</span>
                          ) : (
                            <span className="text-rose-300">Not eligible</span>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleGrantEligibility(grant.id)}
                          className="px-3 py-2 rounded-lg bg-slate-700 text-xs"
                        >
                          Check Eligibility
                        </button>
                        <button
                          onClick={() => handleApplyGrant(grant.id)}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-xs"
                        >
                          Start Application
                        </button>
                      </div>
                    </div>
                  ))}
                  {grants.length === 0 && (
                    <p className="text-sm text-slate-500">No grants found.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" /> Scholarships Directory
                </h3>
                <div className="space-y-3">
                  {scholarships.map((scholarship) => (
                    <div key={scholarship.id} className="rounded-lg bg-slate-800/60 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{scholarship.title}</p>
                          <p className="text-xs text-slate-400">{scholarship.provider}</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {scholarship.deadline
                            ? new Date(scholarship.deadline).toLocaleDateString()
                            : 'No deadline'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(scholarship.tags || []).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => handleApplyScholarship(scholarship.id)}
                          className="px-3 py-2 rounded-lg bg-blue-600 text-xs"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                  {scholarships.length === 0 && (
                    <p className="text-sm text-slate-500">No scholarships found.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-emerald-400" /> Application Tracker
                </h3>
                <div className="space-y-3">
                  {grantApplications.map((app) => (
                    <div key={app.id} className="rounded-lg bg-slate-800/60 p-3">
                      <p className="text-sm font-medium">
                        {app.grant?.title || 'Grant Application'}
                      </p>
                      <p className="text-xs text-slate-400">Status: {app.status}</p>
                    </div>
                  ))}
                  {scholarshipApplications.map((app) => (
                    <div key={app.id} className="rounded-lg bg-slate-800/60 p-3">
                      <p className="text-sm font-medium">
                        {app.scholarship?.title || 'Scholarship Application'}
                      </p>
                      <p className="text-xs text-slate-400">Status: {app.status}</p>
                    </div>
                  ))}
                  {grantApplications.length === 0 && scholarshipApplications.length === 0 && (
                    <p className="text-sm text-slate-500">No applications yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" /> Tips & Prep
                </h3>
                <div className="space-y-3">
                  {grantTips.map((tip, index) => (
                    <div
                      key={`grant-tip-${index}`}
                      className="rounded-lg bg-slate-800/60 p-3 text-sm text-slate-300"
                    >
                      {tip}
                    </div>
                  ))}
                  {scholarshipPrep.map((tip, index) => (
                    <div
                      key={`scholarship-tip-${index}`}
                      className="rounded-lg bg-slate-800/60 p-3 text-sm text-slate-300"
                    >
                      {tip}
                    </div>
                  ))}
                  {grantTips.length === 0 && scholarshipPrep.length === 0 && (
                    <p className="text-sm text-slate-500">Tips will appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
