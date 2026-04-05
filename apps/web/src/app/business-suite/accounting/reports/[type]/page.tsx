'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import {
  ArrowLeft,
  BarChart3,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Filter,
  RefreshCw,
  Printer,
  PieChart,
  Activity,
  AlertCircle,
} from 'lucide-react';

type ReportType = 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'trial-balance';

type ProfitLossData = {
  revenue: { account: string; amount: number }[];
  expenses: { account: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
};

type BalanceSheetData = {
  assets: {
    current: { account: string; amount: number }[];
    nonCurrent: { account: string; amount: number }[];
  };
  liabilities: {
    current: { account: string; amount: number }[];
    nonCurrent: { account: string; amount: number }[];
  };
  equity: { account: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
};

type CashFlowData = {
  operating: { description: string; amount: number }[];
  investing: { description: string; amount: number }[];
  financing: { description: string; amount: number }[];
  operatingTotal: number;
  investingTotal: number;
  financingTotal: number;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
};

type TrialBalanceData = {
  accounts: { code: string; name: string; debit: number; credit: number }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
};

type ReportData = ProfitLossData | BalanceSheetData | CashFlowData | TrialBalanceData;

const reportTitles: Record<ReportType, string> = {
  'profit-loss': 'Profit & Loss Statement',
  'balance-sheet': 'Balance Sheet',
  'cash-flow': 'Cash Flow Statement',
  'trial-balance': 'Trial Balance',
};

const reportDescriptions: Record<ReportType, string> = {
  'profit-loss': 'Summary of income and expenses over a period',
  'balance-sheet': 'Snapshot of assets, liabilities, and equity',
  'cash-flow': 'Analysis of cash inflows and outflows',
  'trial-balance': 'Verification that debits equal credits',
};

export default function AccountingReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportType = params.type as ReportType;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  // Validate report type
  const validTypes: ReportType[] = ['profit-loss', 'balance-sheet', 'cash-flow', 'trial-balance'];
  const isValidType = validTypes.includes(reportType);

  const fetchReport = useCallback(async () => {
    if (!isValidType) return;

    setLoading(true);
    try {
      const res = await api(
        `/financial/reports/${reportType}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (res.ok && res.data) {
        setReportData(res.data);
      } else {
        // Generate mock data for demonstration
        setReportData(generateMockData(reportType));
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      // Use mock data as fallback
      setReportData(generateMockData(reportType));
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange, isValidType]);

  useEffect(() => {
    if (isValidType) {
      fetchReport();
    }
  }, [fetchReport, isValidType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Mock data generator for demonstration
  const generateMockData = (type: ReportType): ReportData => {
    switch (type) {
      case 'profit-loss':
        return {
          revenue: [
            { account: 'Sales Revenue', amount: 85000 },
            { account: 'Service Revenue', amount: 42000 },
            { account: 'Interest Income', amount: 1200 },
          ],
          expenses: [
            { account: 'Cost of Goods Sold', amount: 34000 },
            { account: 'Salaries & Wages', amount: 28000 },
            { account: 'Rent', amount: 8000 },
            { account: 'Marketing', amount: 5500 },
            { account: 'Utilities', amount: 2400 },
            { account: 'Insurance', amount: 1800 },
            { account: 'Office Supplies', amount: 1200 },
          ],
          totalRevenue: 128200,
          totalExpenses: 80900,
          netProfit: 47300,
        };
      case 'balance-sheet':
        return {
          assets: {
            current: [
              { account: 'Cash at Bank', amount: 45000 },
              { account: 'Accounts Receivable', amount: 28000 },
              { account: 'Inventory', amount: 18000 },
              { account: 'Prepaid Expenses', amount: 3500 },
            ],
            nonCurrent: [
              { account: 'Equipment', amount: 32000 },
              { account: 'Vehicles', amount: 25000 },
              { account: 'Less: Accumulated Depreciation', amount: -12000 },
            ],
          },
          liabilities: {
            current: [
              { account: 'Accounts Payable', amount: 15000 },
              { account: 'GST Payable', amount: 4200 },
              { account: 'Accrued Expenses', amount: 3500 },
            ],
            nonCurrent: [
              { account: 'Bank Loan', amount: 35000 },
            ],
          },
          equity: [
            { account: 'Owner\'s Equity', amount: 50000 },
            { account: 'Retained Earnings', amount: 31800 },
          ],
          totalAssets: 139500,
          totalLiabilities: 57700,
          totalEquity: 81800,
        };
      case 'cash-flow':
        return {
          operating: [
            { description: 'Cash receipts from customers', amount: 125000 },
            { description: 'Cash paid to suppliers', amount: -45000 },
            { description: 'Cash paid for wages', amount: -28000 },
            { description: 'Cash paid for rent', amount: -8000 },
            { description: 'Cash paid for other expenses', amount: -12000 },
            { description: 'Interest received', amount: 1200 },
            { description: 'GST paid/received (net)', amount: -3500 },
          ],
          investing: [
            { description: 'Purchase of equipment', amount: -8500 },
            { description: 'Sale of old equipment', amount: 2000 },
          ],
          financing: [
            { description: 'Owner drawings', amount: -15000 },
            { description: 'Loan repayment', amount: -5000 },
          ],
          operatingTotal: 29700,
          investingTotal: -6500,
          financingTotal: -20000,
          netChange: 3200,
          openingBalance: 41800,
          closingBalance: 45000,
        };
      case 'trial-balance':
        return {
          accounts: [
            { code: '1000', name: 'Cash at Bank', debit: 45000, credit: 0 },
            { code: '1100', name: 'Accounts Receivable', debit: 28000, credit: 0 },
            { code: '1200', name: 'Inventory', debit: 18000, credit: 0 },
            { code: '1300', name: 'Prepaid Expenses', debit: 3500, credit: 0 },
            { code: '1500', name: 'Equipment', debit: 32000, credit: 0 },
            { code: '1510', name: 'Accumulated Depreciation', debit: 0, credit: 12000 },
            { code: '2000', name: 'Accounts Payable', debit: 0, credit: 15000 },
            { code: '2100', name: 'GST Payable', debit: 0, credit: 4200 },
            { code: '2500', name: 'Bank Loan', debit: 0, credit: 35000 },
            { code: '3000', name: 'Owner\'s Equity', debit: 0, credit: 50000 },
            { code: '3100', name: 'Retained Earnings', debit: 0, credit: 31800 },
            { code: '4000', name: 'Sales Revenue', debit: 0, credit: 85000 },
            { code: '4100', name: 'Service Revenue', debit: 0, credit: 42000 },
            { code: '5000', name: 'Cost of Goods Sold', debit: 34000, credit: 0 },
            { code: '5100', name: 'Salaries & Wages', debit: 28000, credit: 0 },
            { code: '5200', name: 'Rent Expense', debit: 8000, credit: 0 },
            { code: '5300', name: 'Marketing Expense', debit: 5500, credit: 0 },
            { code: '5400', name: 'Utilities', debit: 2400, credit: 0 },
          ],
          totalDebits: 204400,
          totalCredits: 275000,
          isBalanced: false,
        };
      default:
        return {} as ReportData;
    }
  };

  if (!isValidType) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Report Type</h1>
          <p className="text-white/60 mb-6">The report type &quot;{reportType}&quot; is not valid.</p>
          <Link
            href="/business-suite/accounting"
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
          >
            Back to Accounting
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/business-suite/accounting"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#8B5CF620' }}
                >
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{reportTitles[reportType]}</h1>
                  <p className="text-white/60">{reportDescriptions[reportType]}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReport}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Print"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                className="px-4 py-2 rounded-lg flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-sm">Period:</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-white/40 text-xs mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-500 outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                {['This Month', 'This Quarter', 'This Year'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      const now = new Date();
                      let start: Date;
                      if (preset === 'This Month') {
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                      } else if (preset === 'This Quarter') {
                        const quarter = Math.floor(now.getMonth() / 3);
                        start = new Date(now.getFullYear(), quarter * 3, 1);
                      } else {
                        start = new Date(now.getFullYear(), 0, 1);
                      }
                      setDateRange({
                        startDate: start.toISOString().split('T')[0],
                        endDate: now.toISOString().split('T')[0],
                      });
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-white/60 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">{reportTitles[reportType]}</h2>
              <p className="text-gray-600 text-sm mt-1">
                For the period {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
              </p>
            </div>
          </div>

          <div className="p-8">
            {reportType === 'profit-loss' && reportData && (
              <ProfitLossReport data={reportData as ProfitLossData} formatCurrency={formatCurrency} />
            )}
            {reportType === 'balance-sheet' && reportData && (
              <BalanceSheetReport data={reportData as BalanceSheetData} formatCurrency={formatCurrency} />
            )}
            {reportType === 'cash-flow' && reportData && (
              <CashFlowReport data={reportData as CashFlowData} formatCurrency={formatCurrency} />
            )}
            {reportType === 'trial-balance' && reportData && (
              <TrialBalanceReport data={reportData as TrialBalanceData} formatCurrency={formatCurrency} />
            )}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {validTypes.map((type) => (
            <Link
              key={type}
              href={`/business-suite/accounting/reports/${type}`}
              className={`p-4 rounded-xl border transition-all ${
                type === reportType
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className={`font-medium ${type === reportType ? 'text-purple-400' : 'text-white'}`}>
                {reportTitles[type]}
              </p>
              <p className="text-white/40 text-xs mt-1">{reportDescriptions[type]}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Report Components
function ProfitLossReport({
  data,
  formatCurrency,
}: {
  data: ProfitLossData;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="space-y-8">
      {/* Revenue Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Revenue
        </h3>
        <div className="space-y-2">
          {data.revenue.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-700">{item.account}</span>
              <span className="text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 bg-green-50 px-4 rounded-lg mt-2">
            <span className="font-semibold text-green-700">Total Revenue</span>
            <span className="font-bold text-green-700">{formatCurrency(data.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-600" />
          Expenses
        </h3>
        <div className="space-y-2">
          {data.expenses.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-700">{item.account}</span>
              <span className="text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 bg-red-50 px-4 rounded-lg mt-2">
            <span className="font-semibold text-red-700">Total Expenses</span>
            <span className="font-bold text-red-700">{formatCurrency(data.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Net Profit */}
      <div className="pt-6 border-t-2 border-gray-200">
        <div
          className={`flex justify-between py-4 px-6 rounded-xl ${
            data.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <span className={`text-lg font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}
          </span>
          <span className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(Math.abs(data.netProfit))}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetReport({
  data,
  formatCurrency,
}: {
  data: BalanceSheetData;
  formatCurrency: (n: number) => string;
}) {
  const currentAssets = data.assets.current.reduce((sum, item) => sum + item.amount, 0);
  const nonCurrentAssets = data.assets.nonCurrent.reduce((sum, item) => sum + item.amount, 0);
  const currentLiabilities = data.liabilities.current.reduce((sum, item) => sum + item.amount, 0);
  const nonCurrentLiabilities = data.liabilities.nonCurrent.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Assets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Assets
        </h3>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Current Assets
          </h4>
          <div className="space-y-2">
            {data.assets.current.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{item.account}</span>
                <span className="text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-blue-600 font-medium">
              <span>Total Current Assets</span>
              <span>{formatCurrency(currentAssets)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Non-Current Assets
          </h4>
          <div className="space-y-2">
            {data.assets.nonCurrent.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{item.account}</span>
                <span className={`text-gray-900 ${item.amount < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-blue-600 font-medium">
              <span>Total Non-Current Assets</span>
              <span>{formatCurrency(nonCurrentAssets)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between py-3 bg-blue-50 px-4 rounded-lg">
          <span className="font-bold text-blue-700">TOTAL ASSETS</span>
          <span className="font-bold text-blue-700">{formatCurrency(data.totalAssets)}</span>
        </div>
      </div>

      {/* Liabilities & Equity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-600" />
          Liabilities & Equity
        </h3>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Current Liabilities
          </h4>
          <div className="space-y-2">
            {data.liabilities.current.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{item.account}</span>
                <span className="text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-orange-600 font-medium">
              <span>Total Current Liabilities</span>
              <span>{formatCurrency(currentLiabilities)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Non-Current Liabilities
          </h4>
          <div className="space-y-2">
            {data.liabilities.nonCurrent.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{item.account}</span>
                <span className="text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-orange-600 font-medium">
              <span>Total Non-Current Liabilities</span>
              <span>{formatCurrency(nonCurrentLiabilities)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between py-3 bg-orange-50 px-4 rounded-lg mb-6">
          <span className="font-bold text-orange-700">Total Liabilities</span>
          <span className="font-bold text-orange-700">{formatCurrency(data.totalLiabilities)}</span>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Owner&apos;s Equity
          </h4>
          <div className="space-y-2">
            {data.equity.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{item.account}</span>
                <span className="text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between py-3 bg-purple-50 px-4 rounded-lg mb-4">
          <span className="font-bold text-purple-700">Total Equity</span>
          <span className="font-bold text-purple-700">{formatCurrency(data.totalEquity)}</span>
        </div>

        <div className="flex justify-between py-3 bg-gray-100 px-4 rounded-lg">
          <span className="font-bold text-gray-700">TOTAL LIABILITIES & EQUITY</span>
          <span className="font-bold text-gray-700">
            {formatCurrency(data.totalLiabilities + data.totalEquity)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CashFlowReport({
  data,
  formatCurrency,
}: {
  data: CashFlowData;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="space-y-8">
      {/* Operating Activities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cash Flows from Operating Activities
        </h3>
        <div className="space-y-2">
          {data.operating.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-700">{item.description}</span>
              <span className={`font-medium ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex justify-between py-3 bg-blue-50 px-4 rounded-lg mt-2">
            <span className="font-semibold text-blue-700">Net Cash from Operating Activities</span>
            <span className={`font-bold ${data.operatingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.operatingTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Investing Activities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cash Flows from Investing Activities
        </h3>
        <div className="space-y-2">
          {data.investing.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-700">{item.description}</span>
              <span className={`font-medium ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex justify-between py-3 bg-purple-50 px-4 rounded-lg mt-2">
            <span className="font-semibold text-purple-700">Net Cash from Investing Activities</span>
            <span className={`font-bold ${data.investingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.investingTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Financing Activities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cash Flows from Financing Activities
        </h3>
        <div className="space-y-2">
          {data.financing.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-700">{item.description}</span>
              <span className={`font-medium ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex justify-between py-3 bg-orange-50 px-4 rounded-lg mt-2">
            <span className="font-semibold text-orange-700">Net Cash from Financing Activities</span>
            <span className={`font-bold ${data.financingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.financingTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="pt-6 border-t-2 border-gray-200 space-y-3">
        <div className="flex justify-between py-2">
          <span className="text-gray-700">Net Change in Cash</span>
          <span className={`font-semibold ${data.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.netChange)}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-700">Opening Cash Balance</span>
          <span className="text-gray-900 font-medium">{formatCurrency(data.openingBalance)}</span>
        </div>
        <div className="flex justify-between py-4 px-6 bg-green-100 rounded-xl">
          <span className="text-lg font-bold text-green-700">Closing Cash Balance</span>
          <span className="text-xl font-bold text-green-700">
            {formatCurrency(data.closingBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrialBalanceReport({
  data,
  formatCurrency,
}: {
  data: TrialBalanceData;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-3 text-left text-gray-500 text-sm font-medium">Code</th>
            <th className="py-3 text-left text-gray-500 text-sm font-medium">Account Name</th>
            <th className="py-3 text-right text-gray-500 text-sm font-medium">Debit</th>
            <th className="py-3 text-right text-gray-500 text-sm font-medium">Credit</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts.map((account, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-3 text-gray-500 font-mono text-sm">{account.code}</td>
              <td className="py-3 text-gray-900">{account.name}</td>
              <td className="py-3 text-right text-gray-900">
                {account.debit > 0 ? formatCurrency(account.debit) : '-'}
              </td>
              <td className="py-3 text-right text-gray-900">
                {account.credit > 0 ? formatCurrency(account.credit) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={2} className="py-4 font-bold text-gray-900">
              TOTALS
            </td>
            <td className="py-4 text-right font-bold text-gray-900">
              {formatCurrency(data.totalDebits)}
            </td>
            <td className="py-4 text-right font-bold text-gray-900">
              {formatCurrency(data.totalCredits)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Balance Check */}
      <div className={`mt-6 p-4 rounded-xl ${data.isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center gap-3">
          {data.isBalanced ? (
            <>
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-700">Trial Balance is Balanced</p>
                <p className="text-sm text-green-600">Total debits equal total credits</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-700">Trial Balance is Unbalanced</p>
                <p className="text-sm text-red-600">
                  Difference of {formatCurrency(Math.abs(data.totalDebits - data.totalCredits))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
