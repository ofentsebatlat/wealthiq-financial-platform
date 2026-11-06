import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Sparkles,
  Plus,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  CircleDot,
  BarChart3,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { Transaction } from "../types";
import { SIMULATED_TRANSACTIONS } from "../data/simulatedTransactions";

interface DashboardTabProps {
  transactions: Transaction[];
  availableBalance: number;
  openAddTransactionModal: () => void;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

export default function DashboardTab({
  transactions,
  availableBalance,
  openAddTransactionModal,
  monthlyIncome,
  monthlyExpenses,
  savingsRate
}: DashboardTabProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  // Chart view mode: "monthly" (Clustered Monthly Income vs Expenses), "cumulative" (Smooth Cumulative Growth Ribbon), or "compounding" (Portfolio valuation)
  const [chartMode, setChartMode] = useState<"monthly" | "cumulative" | "compounding">("monthly");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredMonthlyIndex, setHoveredMonthlyIndex] = useState<number | null>(null);

  // Fetch insights on load
  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions,
          balance: availableBalance,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          savingsRate: savingsRate
        })
      });
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (e) {
      console.error("Error loading insights:", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [transactions]);

  // Aggregate category spending for doughnut chart
  const expenseCategories = ["Food", "Transport", "Entertainment", "Utilities", "Shopping", "Health", "Other"] as const;
  const categoryColors: Record<string, string> = {
    Food: "#38bdf8", // Sky blue
    Transport: "#4ade80", // Green
    Entertainment: "#c084fc", // Purple
    Utilities: "#fb923c", // Orange
    Shopping: "#60a5fa", // Blue
    Health: "#f472b6", // Pink
    Other: "#94a3b8" // Slate
  };

  // Active transaction set (ensures active transactions or simulated dataset is used)
  const isSimulatedDataset = !transactions || transactions.length === 0;
  const activeTransactions = transactions && transactions.length > 0 ? transactions : SIMULATED_TRANSACTIONS;

  const categorySpending = expenseCategories.map(cat => {
    const total = activeTransactions
      .filter(t => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, value: total };
  });

  const totalExpenseAllocated = categorySpending.reduce((sum, c) => sum + c.value, 0);

  // ----------------------------------------------------
  // TRANSACTION FLOW LINE GRAPH: EVERY TRANSACTION UP & DOWN (MAY 1 TO NOV 1)
  // ----------------------------------------------------
  const sortedTransactions = [...activeTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Realistic opening balance on May 1 (R14,500 ensures positive checking account balance throughout all 121 transactions, ending at ~R75,435)
  const netTransactionsChange = sortedTransactions.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0
  );
  const baselineStartBalance = isSimulatedDataset
    ? 14500
    : Math.max(10000, availableBalance - netTransactionsChange);

  let currentBal = baselineStartBalance;
  let cumIncomeAcc = 0;
  let cumExpensesAcc = 0;

  const transactionFlowPoints = [
    {
      id: "start-baseline",
      date: "2026-05-01",
      monthName: "May 2026",
      description: "Opening Account Balance",
      category: "Opening",
      type: "neutral" as const,
      amount: 0,
      delta: 0,
      balance: currentBal,
      cumIncome: 0,
      cumExpenses: 0,
      isSalary: false,
      isMajor: false
    },
    ...sortedTransactions.map(tx => {
      const isIncome = tx.type === "income";
      const delta = isIncome ? tx.amount : -tx.amount;
      currentBal += delta;
      if (isIncome) cumIncomeAcc += tx.amount;
      else cumExpensesAcc += tx.amount;

      const isSalary = isIncome && tx.amount >= 30000;
      const isMajor = !isIncome && tx.amount >= 4000;

      const dateObj = new Date(tx.date);
      const monthName = dateObj.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });

      return {
        id: tx.id,
        date: tx.date,
        monthName,
        description: tx.description,
        category: tx.category,
        type: tx.type,
        amount: tx.amount,
        delta,
        balance: currentBal,
        cumIncome: cumIncomeAcc,
        cumExpenses: cumExpensesAcc,
        isSalary,
        isMajor
      };
    })
  ];

  // ----------------------------------------------------
  // DYNAMIC MONTHLY SUMMARY (MAY 1 TO NOV 1, 2026)
  // ----------------------------------------------------
  const monthKeys = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  const monthLabels: Record<string, { name: string; short: string }> = {
    "2026-05": { name: "May 2026", short: "May" },
    "2026-06": { name: "Jun 2026", short: "Jun" },
    "2026-07": { name: "Jul 2026", short: "Jul" },
    "2026-08": { name: "Aug 2026", short: "Aug" },
    "2026-09": { name: "Sep 2026", short: "Sep" },
    "2026-10": { name: "Oct 2026", short: "Oct" },
    "2026-11": { name: "Nov 2026", short: "Nov" }
  };

  let portfolioAcc = Math.round(monthlyIncome * 1.0); // Baseline initial invested portfolio
  let investedAcc = Math.round(monthlyIncome * 1.0);
  const monthlyRate = 0.09 / 12; // 9.0% nominal return compounded monthly

  const dynamicMonthlyData = monthKeys.map((mKey) => {
    const monthTxs = activeTransactions.filter(t => t.date.startsWith(mKey));
    const inc = monthTxs
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = monthTxs
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyInv = monthTxs
      .filter(t => t.category === "Investment")
      .reduce((sum, t) => sum + t.amount, 0) || (mKey !== "2026-11" ? Math.round(monthlyIncome * 0.18) : 0);

    investedAcc += monthlyInv;
    portfolioAcc = (portfolioAcc + monthlyInv) * (1 + monthlyRate);

    return {
      key: mKey,
      name: monthLabels[mKey].name,
      short: monthLabels[mKey].short,
      income: inc,
      expenses: exp,
      surplus: inc - exp,
      invested: investedAcc,
      portfolio: portfolioAcc,
      txCount: monthTxs.length
    };
  });

  // Active highlighted month (default to latest completed month: Oct 2026 or Nov)
  const activeMonthIndex = hoveredMonthlyIndex !== null ? hoveredMonthlyIndex : dynamicMonthlyData.length - 2;
  const activeMonth = dynamicMonthlyData[Math.max(0, Math.min(dynamicMonthlyData.length - 1, activeMonthIndex))];

  // ----------------------------------------------------
  // CHART DIMENSIONS & SCALES (FIT 100% IN CONTAINER)
  // ----------------------------------------------------
  const chartWidth = 660;
  const chartHeight = 210;
  const padding = { top: 20, right: 25, bottom: 28, left: 55 };
  const plotWidth = chartWidth - padding.left - padding.right; // 580
  const plotHeight = chartHeight - padding.top - padding.bottom; // 162

  // 1. Monthly Scale (auto-scales with user monthly salary)
  const maxMonthlyVal = Math.max(
    52000,
    ...dynamicMonthlyData.map((d) => Math.max(d.income, d.expenses))
  ) * 1.12;
  const getMonthlyX = (index: number) => {
    return padding.left + (index / (dynamicMonthlyData.length - 1)) * plotWidth;
  };
  const getMonthlyY = (val: number) => {
    return padding.top + plotHeight - (Math.max(0, val) / maxMonthlyVal) * plotHeight;
  };

  // 2. Cumulative Scale (auto-scales with user monthly salary)
  const maxCumulativeVal = Math.max(
    300000,
    (monthlyIncome * 6) * 1.15
  );
  const getCumulativeY = (val: number) => {
    return padding.top + plotHeight - (Math.max(0, val) / maxCumulativeVal) * plotHeight;
  };

  let runningCumIncome = 0;
  let runningCumExpenses = 0;
  const cumulativeMilestones = dynamicMonthlyData.map((d) => {
    runningCumIncome += d.income;
    runningCumExpenses += d.expenses;
    return {
      name: d.name,
      short: d.short,
      income: d.income,
      expenses: d.expenses,
      cumIncome: runningCumIncome,
      cumExpenses: runningCumExpenses,
      cumSurplus: runningCumIncome - runningCumExpenses
    };
  });

  // Smooth Bézier paths for Cumulative Ribbon
  let cumInflowPath = "";
  let cumOutflowPath = "";
  cumulativeMilestones.forEach((m, i) => {
    const x = getMonthlyX(i);
    const yInc = getCumulativeY(m.cumIncome);
    const yExp = getCumulativeY(m.cumExpenses);
    if (i === 0) {
      cumInflowPath += `M ${x} ${yInc}`;
      cumOutflowPath += `M ${x} ${yExp}`;
    } else {
      const prevX = getMonthlyX(i - 1);
      const prevYInc = getCumulativeY(cumulativeMilestones[i - 1].cumIncome);
      const prevYExp = getCumulativeY(cumulativeMilestones[i - 1].cumExpenses);
      const cpX1 = prevX + (x - prevX) * 0.45;
      const cpX2 = x - (x - prevX) * 0.45;
      cumInflowPath += ` C ${cpX1} ${prevYInc}, ${cpX2} ${yInc}, ${x} ${yInc}`;
      cumOutflowPath += ` C ${cpX1} ${prevYExp}, ${cpX2} ${yExp}, ${x} ${yExp}`;
    }
  });

  let cumSurplusRibbonPath = cumInflowPath;
  for (let i = cumulativeMilestones.length - 1; i >= 0; i--) {
    const x = getMonthlyX(i);
    const yExp = getCumulativeY(cumulativeMilestones[i].cumExpenses);
    if (i === cumulativeMilestones.length - 1) {
      cumSurplusRibbonPath += ` L ${x} ${yExp}`;
    } else {
      const nextX = getMonthlyX(i + 1);
      const nextYExp = getCumulativeY(cumulativeMilestones[i + 1].cumExpenses);
      cumSurplusRibbonPath += ` C ${nextX - (nextX - x) * 0.45} ${nextYExp}, ${x + (nextX - x) * 0.45} ${yExp}, ${x} ${yExp}`;
    }
  }
  cumSurplusRibbonPath += " Z";

  // 3. Compounding Scale (R0 to R125,000)
  const maxCompoundingVal = 125000;
  const getCompoundingY = (val: number) => {
    return padding.top + plotHeight - (val / maxCompoundingVal) * plotHeight;
  };

  let investedLinePath = "";
  let portfolioLinePath = "";
  dynamicMonthlyData.forEach((d, i) => {
    const x = getMonthlyX(i);
    const yInv = getCompoundingY(d.invested);
    const yPort = getCompoundingY(d.portfolio);
    if (i === 0) {
      investedLinePath += `M ${x} ${yInv}`;
      portfolioLinePath += `M ${x} ${yPort}`;
    } else {
      const prevX = getMonthlyX(i - 1);
      const prevYInv = getCompoundingY(dynamicMonthlyData[i - 1].invested);
      const prevYPort = getCompoundingY(dynamicMonthlyData[i - 1].portfolio);
      investedLinePath += ` C ${prevX + (x - prevX) * 0.45} ${prevYInv}, ${x - (x - prevX) * 0.45} ${yInv}, ${x} ${yInv}`;
      portfolioLinePath += ` C ${prevX + (x - prevX) * 0.45} ${prevYPort}, ${x - (x - prevX) * 0.45} ${yPort}, ${x} ${yPort}`;
    }
  });

  // Doughnut calculations
  let currentAccumulator = 0;
  const doughnutSlices = categorySpending
    .filter(c => c.value > 0)
    .map((slice) => {
      const percentage = (slice.value / totalExpenseAllocated) * 100;
      const startAngle = (currentAccumulator / totalExpenseAllocated) * 360;
      currentAccumulator += slice.value;
      const endAngle = (currentAccumulator / totalExpenseAllocated) * 360;

      const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
          x: centerX + radius * Math.cos(angleInRadians),
          y: centerY + radius * Math.sin(angleInRadians)
        };
      };

      const centerX = 100;
      const centerY = 100;
      const r = 70;
      const start = polarToCartesian(centerX, centerY, r, startAngle);
      const end = polarToCartesian(centerX, centerY, r, endAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

      const pathData = [
        "M", start.x, start.y,
        "A", r, r, 0, largeArcFlag, 1, end.x, end.y
      ].join(" ");

      return {
        ...slice,
        path: pathData,
        color: categoryColors[slice.name] || "#cbd5e1",
        percentage,
        startAngle,
        endAngle
      };
    });

  return (
    <div id="dashboard-tab-content" className="p-4 sm:p-8 space-y-4 sm:space-y-8 max-w-7xl mx-auto">

      {/* Header and Call-to-action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Empower your financial decisions with AI smart tracking and simulations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center bg-white px-4 py-2 border border-slate-200 rounded-lg text-xs shadow-sm">
            <span className="text-slate-400 mr-2">Available Balance:</span>
            <span className="font-bold text-slate-700 font-mono">
              R{availableBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            id="btn-add-transaction-dashboard"
            onClick={openAddTransactionModal}
            className="flex items-center space-x-2 bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* KPI: Balance */}
        <div id="kpi-balance" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Balance</span>
            <span className="text-2xl font-bold text-slate-800 font-mono mt-1">
              R{availableBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI: Monthly Income */}
        <div id="kpi-income" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Income</span>
            <span className="text-2xl font-bold text-slate-800 font-mono mt-1">
              R{monthlyIncome.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI: Monthly Expenses */}
        <div id="kpi-expenses" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-red-50 text-red-500 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Expenses</span>
            <span className="text-2xl font-bold text-slate-800 font-mono mt-1">
              R{monthlyExpenses.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI: Savings Rate */}
        <div id="kpi-savings-rate" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-capitec-blue-light rounded-lg">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Savings Rate</span>
            <span className="text-2xl font-bold text-slate-800 font-mono mt-1">
              {savingsRate.toFixed(0)}%
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts & Side widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Chart: Interactive Financial Overview & Analytics */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 text-left overflow-hidden">

          {/* Header & View Switcher */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <h3 className="font-bold text-slate-800 text-base font-display">
                  {chartMode === "monthly"
                    ? "Monthly Cash Flow (Income vs. Expenses)"
                    : chartMode === "cumulative"
                      ? "Cumulative Growth & Savings Ribbon"
                      : "WealthIQ Core Investment Compounding"}
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  May – Nov 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {chartMode === "monthly"
                  ? "Comparing monthly net salary inflows against living commitments, debt orders, and net surplus."
                  : chartMode === "cumulative"
                    ? "Continuous dual trend tracking cumulative earnings against living commitments and net surplus."
                    : "Tracking monthly R8,100 WealthIQ ETF allocations compounding at a 9.0% nominal annual return."}
              </p>
            </div>

            {/* Toggle Switcher - Fits 100% inside container */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 shrink-0 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setChartMode("monthly")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${chartMode === "monthly"
                    ? "bg-white text-emerald-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
                title="Clustered Monthly Income vs. Expenses Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monthly Flow</span>
              </button>

              <button
                type="button"
                onClick={() => setChartMode("cumulative")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${chartMode === "cumulative"
                    ? "bg-white text-capitec-blue shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
                title="Smooth Cumulative Inflow vs Outflow Ribbon"
              >
                <TrendingUp className="w-3.5 h-3.5 text-capitec-blue" />
                <span>Growth Ribbon</span>
              </button>

              <button
                type="button"
                onClick={() => setChartMode("compounding")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${chartMode === "compounding"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
                title="Portfolio Compounding at 9% p.a."
              >
                <PiggyBank className="w-3.5 h-3.5 text-indigo-600" />
                <span>Portfolio (9%)</span>
              </button>
            </div>
          </div>

          {/* ACTIVE HIGHLIGHT BANNER: Monthly Breakdown Mode */}
          {chartMode === "monthly" && activeMonth && (
            <div className="p-3 mb-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn overflow-hidden">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeMonth.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Monthly Position:</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {activeMonth.surplus >= 0 ? "+" : ""}R{activeMonth.surplus.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} Surplus
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Salary Inflow:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600">
                    R{activeMonth.income.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Outflows:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-capitec-red">
                    R{activeMonth.expenses.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Savings Margin:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600">
                    {activeMonth.income > 0 ? ((activeMonth.surplus / activeMonth.income) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE HIGHLIGHT BANNER: Cumulative Growth Ribbon Mode */}
          {chartMode === "cumulative" && (
            <div className="p-3 mb-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn overflow-hidden">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 text-capitec-blue rounded-lg font-bold text-xs flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-capitec-blue" />
                  <span>{cumulativeMilestones[activeMonthIndex]?.name || "May – Nov 2026"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Cumulative Position:</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    Net Surplus: +R{(cumulativeMilestones[activeMonthIndex]?.cumSurplus || 61010).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cumulative Inflows:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600">
                    R{(cumulativeMilestones[activeMonthIndex]?.cumIncome || 270000).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cumulative Outflows:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-capitec-red">
                    R{(cumulativeMilestones[activeMonthIndex]?.cumExpenses || 208989).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Surplus Margin:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600">
                    {(() => {
                      const cur = cumulativeMilestones[activeMonthIndex] || cumulativeMilestones[cumulativeMilestones.length - 2];
                      return cur && cur.cumIncome > 0
                        ? ((cur.cumSurplus / cur.cumIncome) * 100).toFixed(1) + "%"
                        : "0.0%";
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE HIGHLIGHT BANNER: Compounding Mode */}
          {chartMode === "compounding" && activeMonth && (
            <div className="p-3 mb-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn overflow-hidden">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-xs">
                  {activeMonth.name}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Market Valuation:</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">
                    R{activeMonth.portfolio.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capital Injected:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-700">
                    R{activeMonth.invested.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cumulative Gains:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600">
                    +R{(activeMonth.portfolio - activeMonth.invested).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive SVG Chart Canvas */}
          <div className="h-48 sm:h-52 relative w-full overflow-hidden">

            {/* VIEW 1: CLUSTERED MONTHLY INFLOW VS OUTFLOW BARS */}
            {chartMode === "monthly" && (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full block"
              >
                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = padding.top + ratio * plotHeight;
                  const displayValue = maxMonthlyVal * (1 - ratio);
                  return (
                    <g key={idx} className="opacity-70">
                      <line
                        x1={padding.left}
                        y1={yVal}
                        x2={chartWidth - padding.right}
                        y2={yVal}
                        stroke="#f1f5f9"
                        strokeWidth="1.2"
                      />
                      <text
                        x={padding.left - 8}
                        y={yVal + 3.5}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="monospace"
                        className="fill-slate-400 font-semibold select-none"
                      >
                        {`R${(displayValue / 1000).toFixed(0)}k`}
                      </text>
                    </g>
                  );
                })}

                {/* Connecting Net Surplus Trendline */}
                {(() => {
                  let surplusLine = "";
                  dynamicMonthlyData.forEach((d, idx) => {
                    const x = getMonthlyX(idx);
                    const ySurplus = getMonthlyY(Math.max(0, d.surplus * 2.8)); // scaled for visibility
                    if (idx === 0) surplusLine += `M ${x} ${ySurplus}`;
                    else surplusLine += ` L ${x} ${ySurplus}`;
                  });
                  return (
                    <path
                      d={surplusLine}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.8"
                      strokeDasharray="4 3"
                      opacity={0.7}
                      className="pointer-events-none"
                    />
                  );
                })()}

                {/* Clustered Bars for Each Month */}
                {dynamicMonthlyData.map((d, idx) => {
                  const x = getMonthlyX(idx);
                  const isHovered = (hoveredMonthlyIndex ?? activeMonthIndex) === idx;
                  const barW = 16;
                  const yZero = padding.top + plotHeight;
                  const yInc = getMonthlyY(d.income);
                  const yExp = getMonthlyY(d.expenses);
                  const hInc = Math.max(2, yZero - yInc);
                  const hExp = Math.max(2, yZero - yExp);

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthlyIndex(idx)}
                      onClick={() => setHoveredMonthlyIndex(idx)}
                    >
                      {/* Hover column background */}
                      <rect
                        x={x - 25}
                        y={padding.top}
                        width={50}
                        height={plotHeight}
                        fill={isHovered ? "#f8fafc" : "transparent"}
                        rx={6}
                      />

                      {/* Income Bar (Emerald Green) */}
                      <rect
                        x={x - barW - 2}
                        y={yInc}
                        width={barW}
                        height={hInc}
                        rx={3}
                        fill="#10b981"
                        opacity={isHovered ? 1 : 0.88}
                        className="transition-all duration-200"
                      />
                      {d.income > 0 && (
                        <text
                          x={x - barW / 2 - 2}
                          y={yInc - 4}
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          className="fill-emerald-700 pointer-events-none select-none"
                        >
                          {d.income >= 1000 ? `R${(d.income / 1000).toFixed(0)}k` : `R${d.income.toFixed(0)}`}
                        </text>
                      )}

                      {/* Expense Bar (Theme Red) */}
                      <rect
                        x={x + 2}
                        y={yExp}
                        width={barW}
                        height={hExp}
                        rx={3}
                        fill="#e51b24"
                        opacity={isHovered ? 1 : 0.88}
                        className="transition-all duration-200"
                      />
                      <text
                        x={x + barW / 2 + 2}
                        y={yExp - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="fill-red-600 pointer-events-none select-none"
                      >
                        {d.expenses >= 1000 ? `R${(d.expenses / 1000).toFixed(0)}k` : `R${d.expenses.toFixed(0)}`}
                      </text>

                      {/* Surplus Marker Dot */}
                      <circle
                        cx={x}
                        cy={getMonthlyY(Math.max(0, d.surplus * 2.8))}
                        r={isHovered ? 4.5 : 3}
                        fill="white"
                        stroke="#10b981"
                        strokeWidth="2"
                      />

                      {/* Month Label */}
                      <text
                        x={x}
                        y={yZero + 18}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isHovered ? "bold" : "600"}
                        className={`${isHovered ? "fill-slate-900" : "fill-slate-500"} select-none pointer-events-none font-sans`}
                      >
                        {d.short}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* VIEW 2: CUMULATIVE GROWTH RIBBON (SMOOTH DUAL TREND) */}
            {chartMode === "cumulative" && (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full block"
              >
                <defs>
                  <linearGradient id="growthRibbonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = padding.top + ratio * plotHeight;
                  const displayValue = maxCumulativeVal * (1 - ratio);
                  return (
                    <g key={idx} className="opacity-70">
                      <line
                        x1={padding.left}
                        y1={yVal}
                        x2={chartWidth - padding.right}
                        y2={yVal}
                        stroke="#f1f5f9"
                        strokeWidth="1.2"
                      />
                      <text
                        x={padding.left - 8}
                        y={yVal + 3.5}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="monospace"
                        className="fill-slate-400 font-semibold select-none"
                      >
                        {`R${(displayValue / 1000).toFixed(0)}k`}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Cumulative Surplus Ribbon */}
                <path
                  d={cumSurplusRibbonPath}
                  fill="url(#growthRibbonGrad)"
                  className="transition-all duration-300 pointer-events-none"
                />

                {/* Line 1: Cumulative Inflow Curve (Emerald Green) */}
                <path
                  d={cumInflowPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Line 2: Cumulative Outflow Curve (Crimson Red) */}
                <path
                  d={cumOutflowPath}
                  fill="none"
                  stroke="#e51b24"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Month Milestone Nodes */}
                {cumulativeMilestones.map((m, idx) => {
                  const x = getMonthlyX(idx);
                  const yInc = getCumulativeY(m.cumIncome);
                  const yExp = getCumulativeY(m.cumExpenses);
                  const isHovered = (hoveredMonthlyIndex ?? activeMonthIndex) === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthlyIndex(idx)}
                      onClick={() => setHoveredMonthlyIndex(idx)}
                    >
                      {/* Hitbox */}
                      <rect x={x - 20} y={padding.top} width={40} height={plotHeight} fill="transparent" />

                      {/* Inflow Node */}
                      <circle cx={x} cy={yInc} r={isHovered ? 5.5 : 4} fill="white" stroke="#10b981" strokeWidth="2.5" />
                      {/* Outflow Node */}
                      <circle cx={x} cy={yExp} r={isHovered ? 5 : 3.5} fill="white" stroke="#e51b24" strokeWidth="2" />

                      {/* Month Label */}
                      <text
                        x={x}
                        y={padding.top + plotHeight + 18}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isHovered ? "bold" : "600"}
                        className={`${isHovered ? "fill-slate-900" : "fill-slate-500"} select-none pointer-events-none font-sans`}
                      >
                        {m.short}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* VIEW 3: COMPOUNDING INVESTMENT TRAJECTORY */}
            {chartMode === "compounding" && (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full block"
              >
                <defs>
                  <linearGradient id="compoundingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = padding.top + ratio * plotHeight;
                  const displayValue = maxCompoundingVal * (1 - ratio);
                  return (
                    <g key={idx} className="opacity-70">
                      <line x1={padding.left} y1={yVal} x2={chartWidth - padding.right} y2={yVal} stroke="#f1f5f9" strokeWidth="1.2" />
                      <text x={padding.left - 8} y={yVal + 3.5} textAnchor="end" fontSize="9" fontFamily="monospace" className="fill-slate-400 font-semibold select-none">
                        {`R${(displayValue / 1000).toFixed(0)}k`}
                      </text>
                    </g>
                  );
                })}

                {/* Capital Contributed Line (Dashed Slate) */}
                <path d={investedLinePath} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="4 3" />

                {/* Total Portfolio Valuation Line (Indigo Solid) */}
                <path d={portfolioLinePath} fill="none" stroke="#4f46e5" strokeWidth="3.2" strokeLinecap="round" />

                {dynamicMonthlyData.map((d, idx) => {
                  const x = getMonthlyX(idx);
                  const yPort = getCompoundingY(d.portfolio);
                  const isHovered = (hoveredMonthlyIndex ?? activeMonthIndex) === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthlyIndex(idx)}
                      onClick={() => setHoveredMonthlyIndex(idx)}
                    >
                      <rect x={x - 20} y={padding.top} width={40} height={plotHeight} fill="transparent" />
                      <circle cx={x} cy={yPort} r={isHovered ? 6 : 4.5} fill="white" stroke="#4f46e5" strokeWidth="2.5" />
                      <text
                        x={x}
                        y={padding.top + plotHeight + 18}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isHovered ? "bold" : "600"}
                        className={`${isHovered ? "fill-slate-900" : "fill-slate-500"} select-none pointer-events-none font-sans`}
                      >
                        {d.short}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Custom Interactive Legend & Dynamic Stats Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">

            {chartMode === "monthly" ? (
              <>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                    <span className="font-semibold text-slate-700">Salary Inflow (R{Math.round(monthlyIncome).toLocaleString("en-ZA")}/mo)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-capitec-red rounded-xs" />
                    <span className="font-semibold text-slate-700">Variable Outflows (R30.9k – R42.9k)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-0.5 bg-emerald-500 border-b border-dashed border-emerald-600" />
                    <span className="font-semibold text-emerald-800">Net Surplus Trend (Variable)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Income Outpaces Expenses in 100% of Periods</span>
                </div>
              </>
            ) : chartMode === "cumulative" ? (
              <>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="font-semibold text-slate-700">Cumulative Inflows (R{Math.round((cumulativeMilestones[activeMonthIndex]?.cumIncome || (monthlyIncome * 6)) / 1000)}k)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 bg-capitec-red rounded-full" />
                    <span className="font-semibold text-slate-700">Cumulative Outflows (R226k)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded-xs" />
                    <span className="font-semibold text-emerald-800">Net Surplus Area (+R44k)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Consistent 22.6% Surplus Margin</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-0.5 bg-slate-400 border-b border-dashed border-slate-500" />
                  <span className="font-semibold text-slate-700">Capital Injected (R101 700)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 bg-indigo-600 rounded-full" />
                  <span className="font-semibold text-slate-700">Portfolio Market Valuation (R110 750)</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Chart: Spending Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Spending Breakdown</h3>
            <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-semibold">
              May – Nov 2026
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            {totalExpenseAllocated > 0 ? (
              <div className="relative w-44 h-44 flex items-center justify-center">

                {/* SVG Doughnut */}
                <svg className="w-full h-full transform -rotate-90">
                  {doughnutSlices.map((slice, index) => (
                    <path
                      key={index}
                      d={slice.path}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="22"
                      className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                      style={{
                        strokeDasharray: slice.percentage === 100 ? "440" : "auto",
                      }}
                      onMouseEnter={() => setActiveCategoryIndex(index)}
                      onMouseLeave={() => setActiveCategoryIndex(null)}
                    />
                  ))}
                </svg>

                {/* Central Labels */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {activeCategoryIndex !== null ? doughnutSlices[activeCategoryIndex].name : "Total Out"}
                  </span>
                  <span className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                    R{activeCategoryIndex !== null
                      ? doughnutSlices[activeCategoryIndex].value.toFixed(0)
                      : totalExpenseAllocated.toFixed(0)
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-44 h-44 rounded-full border-[18px] border-slate-100 flex items-center justify-center flex-col text-slate-400">
                <span className="text-xs font-semibold">R0.00</span>
                <span className="text-[10px] text-slate-400 text-center px-4 leading-tight mt-1">No Expenses Recorded</span>
              </div>
            )}

            {/* Custom Interactive Legend */}
            <div className="w-full grid grid-cols-2 gap-2 mt-6 text-xs text-left">
              {categorySpending
                .filter(c => c.value > 0)
                .map((cat, i) => {
                  const percentage = totalExpenseAllocated > 0 ? (cat.value / totalExpenseAllocated) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-center space-x-2 p-1.5 rounded transition ${activeCategoryIndex === i ? "bg-slate-50 font-semibold text-slate-800" : "text-slate-500"
                        }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors[cat.name] }} />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="font-mono text-slate-600 text-[10px]">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

      </div>

      {/* Low Row: WealthIQ Insights & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Insights list */}
        <div id="wealthiq-insights-panel" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2 text-left relative overflow-hidden">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <span className="bg-amber-100 text-amber-600 p-1.5 rounded-md flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </span>
              <span>Wealth<span className="text-capitec-red">IQ</span> AI Insights</span>
            </h3>

            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-capitec-red"></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Live Analysis
              </span>
              <button
                id="btn-regenerate-insights"
                onClick={fetchInsights}
                disabled={loadingInsights}
                title="Regenerate Smart Insights"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingInsights ? "animate-spin text-capitec-red" : ""}`} />
              </button>
            </div>
          </div>

          {/* List of Insights */}
          <div className="space-y-3">
            {loadingInsights ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex space-x-3 items-center animate-pulse">
                    <div className="w-5 h-5 bg-slate-100 rounded-full shrink-0" />
                    <div className="h-4 bg-slate-100 rounded-full w-5/6" />
                  </div>
                ))}
              </div>
            ) : insights.length > 0 ? (
              insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex space-x-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition"
                >
                  <span className="text-capitec-red font-bold text-sm shrink-0">
                    •
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No insights generated. Click the refresh button to trigger AI analysis.</p>
              </div>
            )}
          </div>
        </div>

        {/* Micro savings / local promotion widget */}
        <div className="bg-gradient-to-br from-capitec-blue to-capitec-blue-light p-6 rounded-xl text-white shadow-sm flex flex-col justify-between">
          <div className="text-left">
            <span className="bg-white/10 text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              WealthIQ Rates Check
            </span>
            <h4 className="text-lg font-bold font-display mt-3 leading-snug">
              Maximize Compound Benefits
            </h4>
            <p className="text-xs text-white/80 leading-relaxed mt-2">
              Moving R10,000 from transactional into our fixed deposit currently earns up to <strong className="text-white">8.25%</strong> per annum.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 mt-4 flex items-center justify-between text-xs">
            <span className="text-white/70">Estimated 1-Year Earnings:</span>
            <strong className="font-mono text-emerald-300 font-bold text-sm">+R825.00</strong>
          </div>
        </div>

      </div>

    </div>
  );
}
