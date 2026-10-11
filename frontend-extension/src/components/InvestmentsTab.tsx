import { useState, FormEvent } from "react";
import { 
  Briefcase, 
  Plus, 
  TrendingUp, 
  Percent, 
  Layers, 
  HelpCircle,
  PlusCircle,
  TrendingDown,
  ChevronRight,
  Info
} from "lucide-react";
import { InvestmentItem } from "../types";

interface InvestmentsTabProps {
  investments: InvestmentItem[];
  onAddInvestment: (inv: Omit<InvestmentItem, "id">) => void;
  onDeleteInvestment: (id: string) => void;
}

export default function InvestmentsTab({
  investments,
  onAddInvestment,
  onDeleteInvestment
}: InvestmentsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentItem["type"]>("Unit Trust");
  const [currentValue, setCurrentValue] = useState(5000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState(8.5);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddInvestment({
      name,
      type,
      currentValue,
      monthlyContribution,
      expectedAnnualReturn,
      dateOpened: new Date().toISOString().split("T")[0]
    });
    setName("");
    setCurrentValue(5000);
    setMonthlyContribution(500);
    setExpectedAnnualReturn(8.5);
    setShowAddForm(false);
  };

  const totalValue = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const totalMonthly = investments.reduce((sum, item) => sum + item.monthlyContribution, 0);

  // South African Standard Rates table for comparing
  const standardRates = [
    { name: "Capitec Active Savings Pocket", rate: "up to 5.25%", desc: "No notice required. Interest earned on daily balance." },
    { name: "Capitec 12-Month Fixed Deposit", rate: "8.15% - 8.25%", desc: "SARS tax-free account option available. Max profit." },
    { name: "SATRIX 40 ETF (South African Equities)", rate: "11.20% (Avg)", desc: "Tracks JSE Top 40 shares. Higher volatility, long term." },
    { name: "Standard Retail Savings Bonds", rate: "7.75% - 8.50%", desc: "Backed by National Treasury. Zero capital risk." }
  ];

  return (
    <div id="investments-tab-content" className="p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
            Investment Portfolio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulate asset growth across unit trusts, savings plans, equities, and crypto pockets.
          </p>
        </div>
        <button
          id="btn-toggle-add-investment"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center space-x-2 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer ${
            showAddForm 
              ? "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200" 
              : "bg-capitec-blue hover:bg-capitec-blue-light text-white"
          }`}
        >
          <Plus className={`w-4 h-4 transition ${showAddForm ? "rotate-45 text-red-500" : ""}`} />
          <span>{showAddForm ? "Cancel Form" : "Add Simulation Asset"}</span>
        </button>
      </div>

      {/* Add Investment Form */}
      {showAddForm && (
        <form 
          id="add-investment-form"
          onSubmit={handleSubmit} 
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn"
        >
          <h3 className="text-base font-bold text-slate-800 md:col-span-3 pb-2 border-b border-slate-100">
            Open New Simulated Investment Asset
          </h3>

          {/* Name */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Asset Name</label>
            <input
              id="investment-name"
              type="text"
              placeholder="e.g. Satrix JSE ETF, Capitec Pocket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
              required
            />
          </div>

          {/* Type */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Asset Type</label>
            <select
              id="investment-type"
              value={type}
              onChange={(e) => setType(e.target.value as InvestmentItem["type"])}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
            >
              <option value="Share">Share / Equities</option>
              <option value="Unit Trust">Unit Trust</option>
              <option value="Fixed Deposit">Fixed Deposit</option>
              <option value="Savings pocket">Savings pocket</option>
              <option value="Crypto">Cryptocurrency</option>
            </select>
          </div>

          {/* Current Value */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Initial Balance (R)</label>
            <input
              id="investment-value"
              type="number"
              min={1}
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Monthly Contribution */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Deposit (R)</label>
            <input
              id="investment-contribution"
              type="number"
              min={0}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Return Rate */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Expected Annual Growth (%)</label>
            <input
              id="investment-return"
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={expectedAnnualReturn}
              onChange={(e) => setExpectedAnnualReturn(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              id="btn-submit-investment"
              type="submit"
              className="w-full bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-sm py-2.5 rounded-lg shadow transition-all cursor-pointer"
            >
              Confirm Asset Allocation
            </button>
          </div>
        </form>
      )}

      {/* Portfolio Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulated Portfolio Value</span>
            <h3 className="text-2xl font-bold font-mono text-slate-800 mt-1">R{totalValue.toLocaleString("en-ZA")}</h3>
          </div>
          <Briefcase className="w-8 h-8 text-capitec-blue" />
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Monthly Savings Contribution</span>
            <h3 className="text-2xl font-bold font-mono text-slate-800 mt-1">R{totalMonthly.toLocaleString("en-ZA")}</h3>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset Class Spread</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{new Set(investments.map(i => i.type)).size} Classes</h3>
          </div>
          <Layers className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      {/* Active Assets Table and South Africa Rate Comparator in 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Table of active simulated assets */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Your Simulated Growth Portfolios</h3>
            <span className="text-xs text-slate-400 font-mono">{investments.length} Active Holdings</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50/20 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-right">Monthly (R)</th>
                  <th className="px-5 py-3 text-right">Expected Return</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {investments.length > 0 ? (
                  investments.map((item) => (
                    <tr key={item.id} id={`investment-row-${item.id}`} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                        R{item.currentValue.toLocaleString("en-ZA")}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-500">
                        R{item.monthlyContribution.toLocaleString("en-ZA")}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-600 font-bold font-mono">
                        {item.expectedAnnualReturn.toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          id={`btn-del-invest-${item.id}`}
                          onClick={() => onDeleteInvestment(item.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-capitec-red rounded-lg transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                      No active investments in sandbox. Try clicking "Add Simulation Asset" to model some wealth.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Benchmark comparator pocket */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
          <h3 className="font-bold text-slate-800 flex items-center space-x-2 mb-4">
            <Percent className="w-5 h-5 text-capitec-blue" />
            <span>ZA Investment Benchmarks</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Compare current South African rate guides to make realistic assumptions in your simulations.
          </p>

          <div className="space-y-4">
            {standardRates.map((rate, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg hover:border-slate-200 transition">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-700 truncate">{rate.name}</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-600 shrink-0 ml-1">{rate.rate}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{rate.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3 text-left">
            <Info className="w-4 h-4 text-capitec-blue mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-capitec-blue">Tax Benefit Alert</span>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                South Africa permits R36,000 per year tax-free savings contribution. Capital gains or interest inside a registered Tax-Free Savings Account (TFSA) is exempt from tax!
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
