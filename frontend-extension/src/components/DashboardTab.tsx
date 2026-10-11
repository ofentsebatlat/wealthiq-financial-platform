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
  AlertCircle
} from "lucide-react";
import { Transaction } from "../types";

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

  // Fetch insights on load
  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions.slice(0, 8),
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

  const categorySpending = expenseCategories.map(cat => {
    const total = transactions
      .filter(t => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, value: total };
  });

  const totalExpenseAllocated = categorySpending.reduce((sum, c) => sum + c.value, 0);

  // Standardize 6-month list for Income vs Expenses
  const months = ["Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026"];
  const monthlyData = [
    { name: "Feb 2026", income: 18000, expenses: 14500 },
    { name: "Mar 2026", income: 19500, expenses: 15100 },
    { name: "Apr 2026", income: 24000, expenses: 16800 },
    { name: "May 2026", income: 22000, expenses: 15200 },
    { name: "Jun 2026", income: 25000, expenses: 17200 },
    { name: "Jul 2026", income: monthlyIncome, expenses: monthlyExpenses }
  ];

  // Max value for bar heights scaling
  const maxBarValue = Math.max(...monthlyData.flatMap(d => [d.income, d.expenses]), 1000);

  // Doughnut calculations
  let currentAccumulator = 0;
  const doughnutSlices = categorySpending
    .filter(c => c.value > 0)
    .map((slice, index) => {
      const percentage = (slice.value / totalExpenseAllocated) * 100;
      const startAngle = (currentAccumulator / totalExpenseAllocated) * 360;
      currentAccumulator += slice.value;
      const endAngle = (currentAccumulator / totalExpenseAllocated) * 360;

      // Coordinate conversions for SVG arc path
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
            className="flex items-center space-x-2 bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all"
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
        
        {/* Chart: Income vs Expenses */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span>Income vs Expenses</span>
            </h3>
            <span className="text-xs font-medium text-slate-400">Past 6 Months</span>
          </div>

          {/* Interactive Custom SVG Chart */}
          <div className="h-64 relative flex flex-col justify-between">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-t border-slate-100 w-full h-0" />
              ))}
            </div>

            <div className="relative h-48 w-full flex justify-around items-end px-4 z-10">
              {monthlyData.map((d, index) => {
                const incomeHeight = maxBarValue > 0 ? (d.income / maxBarValue) * 100 : 0;
                const expenseHeight = maxBarValue > 0 ? (d.expenses / maxBarValue) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center w-12 group relative">
                    <div className="flex space-x-1.5 items-end h-36 w-full justify-center">
                      
                      {/* Income Bar */}
                      <div 
                        style={{ height: `${Math.max(incomeHeight, 4)}%` }}
                        className="w-4 bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 cursor-pointer relative group-hover:scale-y-105"
                        title={`Income: R${d.income.toFixed(0)}`}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white font-mono text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow z-20">
                          R{d.income.toLocaleString("en-ZA")}
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div 
                        style={{ height: `${Math.max(expenseHeight, 4)}%` }}
                        className="w-4 bg-capitec-red rounded-t transition-all duration-500 hover:bg-capitec-red-dark cursor-pointer relative group-hover:scale-y-105"
                        title={`Expense: R${d.expenses.toFixed(0)}`}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white font-mono text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow z-20">
                          R{d.expenses.toLocaleString("en-ZA")}
                        </div>
                      </div>

                    </div>
                    <span className="text-[10px] font-medium text-slate-400 mt-2 whitespace-nowrap">
                      {d.name.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom Legend */}
            <div className="flex justify-center items-center space-x-6 text-xs text-slate-500 mt-2 border-t border-slate-100 pt-3">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 bg-green-500 rounded" />
                <span className="font-semibold text-slate-700">Income</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 bg-capitec-red rounded" />
                <span className="font-semibold text-slate-700">Expenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart: Spending Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Spending Breakdown</h3>
            <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-semibold">
              Last 30 Days
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
              // Empty Gray State matching Capitec look exactly when there's R0
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
                      className={`flex items-center space-x-2 p-1.5 rounded transition ${
                        activeCategoryIndex === i ? "bg-slate-50 font-semibold text-slate-800" : "text-slate-500"
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors[cat.name] }} />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="font-mono text-slate-600 text-[10px]">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              {totalExpenseAllocated === 0 && (
                <p className="col-span-2 text-center text-xs text-slate-400 italic py-2">
                  Add custom transactions or change existing ones to populate charts.
                </p>
              )}
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
              <span className="bg-yellow-100 text-yellow-600 p-1.5 rounded-md">
                ⚡
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
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
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
                    💡
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
              Capitec Rates Check
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
