import { useState } from "react";
import { 
  Calculator, 
  HelpCircle, 
  Percent, 
  Clock, 
  Briefcase, 
  TrendingUp, 
  Coins 
} from "lucide-react";

export default function CalculatorTab() {
  const [principal, setPrincipal] = useState(25000); // Initial deposit
  const [monthlyContribution, setMonthlyContribution] = useState(1500); // Monthly savings
  const [rate, setRate] = useState(8.5); // Annual return in %
  const [years, setYears] = useState(15); // Duration in years

  // Calculate values year by year
  const chartPoints: { year: number; total: number; deposits: number; interest: number }[] = [];
  let currentBalance = principal;
  let totalDeposits = principal;

  const monthlyRate = (rate / 100) / 12;

  for (let y = 1; y <= years; y++) {
    // 12 months compounding per year
    for (let m = 0; m < 12; m++) {
      currentBalance = currentBalance * (1 + monthlyRate) + monthlyContribution;
      totalDeposits += monthlyContribution;
    }
    const interest = currentBalance - totalDeposits;
    
    // Add point for each year (or split by interval if many years)
    chartPoints.push({
      year: y,
      total: currentBalance,
      deposits: totalDeposits,
      interest: interest
    });
  }

  const finalTotal = currentBalance;
  const finalDeposits = totalDeposits;
  const finalInterest = finalTotal - finalDeposits;

  // SVG Chart Dimensions
  const chartHeight = 220;
  const chartWidth = 500;
  const padding = 35;

  const maxTotal = Math.max(...chartPoints.map(p => p.total), 1000);

  // Convert coordinate to SVG box
  const getX = (index: number) => {
    return padding + (index / (years - 1 || 1)) * (chartWidth - padding * 2);
  };

  const getY = (value: number) => {
    return chartHeight - padding - (value / maxTotal) * (chartHeight - padding * 2);
  };

  // Build SVG path strings
  let totalPath = "";
  let depositPath = "";

  chartPoints.forEach((p, idx) => {
    const x = getX(idx);
    const yTotal = getY(p.total);
    const yDeposit = getY(p.deposits);

    if (idx === 0) {
      totalPath = `M ${x} ${yTotal}`;
      depositPath = `M ${x} ${yDeposit}`;
    } else {
      totalPath += ` L ${x} ${yTotal}`;
      depositPath += ` L ${x} ${yDeposit}`;
    }
  });

  return (
    <div id="calculator-tab-content" className="p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
          Compound Growth Calculator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore the compounding effect. Drag the sliders to visualize your future Capitec wealth curves.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Sliders Input Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-capitec-red" />
            <span>Interactive Variables</span>
          </h3>

          {/* Principal */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
              <label className="font-semibold text-slate-600">Initial Deposit (Principal)</label>
              <span className="font-bold font-mono text-slate-800 text-base bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                R{principal.toLocaleString("en-ZA")}
              </span>
            </div>
            <input
              id="slider-principal"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-capitec-red"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>R0</span>
              <span>R250k</span>
              <span>R500,000</span>
            </div>
          </div>

          {/* Monthly Contribution */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
              <label className="font-semibold text-slate-600">Monthly Contribution</label>
              <span className="font-bold font-mono text-slate-800 text-base bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                R{monthlyContribution.toLocaleString("en-ZA")}
              </span>
            </div>
            <input
              id="slider-monthly"
              type="range"
              min="0"
              max="25000"
              step="250"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-capitec-red"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>R0</span>
              <span>R12.5k</span>
              <span>R25,000</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
              <label className="font-semibold text-slate-600">Annual Return Rate (%)</label>
              <span className="font-bold font-mono text-slate-800 text-base bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                {rate.toFixed(1)}%
              </span>
            </div>
            <input
              id="slider-rate"
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-capitec-red"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1.0%</span>
              <span>12.5%</span>
              <span>25.0%</span>
            </div>
          </div>

          {/* Years */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
              <label className="font-semibold text-slate-600">Duration (Years)</label>
              <span className="font-bold font-mono text-slate-800 text-base bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                {years} Years
              </span>
            </div>
            <input
              id="slider-years"
              type="range"
              min="1"
              max="40"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-capitec-red"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1 Yr</span>
              <span>20 Yrs</span>
              <span>40 Years</span>
            </div>
          </div>

        </div>

        {/* Dynamic Display results and line chart */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Briefcase className="w-3 h-3 text-capitec-red shrink-0" />
                <span>Total Future Value</span>
              </span>
              <h2 className="text-xl font-bold font-mono mt-2 tracking-tight">
                R{finalTotal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
              </h2>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Coins className="w-3 h-3 text-slate-500 shrink-0" />
                <span>Your Total Deposits</span>
              </span>
              <h2 className="text-xl font-bold font-mono text-slate-800 mt-2 tracking-tight">
                R{finalDeposits.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
              </h2>
            </div>

            <div className="bg-emerald-50/55 p-5 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Compound Interest</span>
              </span>
              <h2 className="text-xl font-bold font-mono text-emerald-600 mt-2 tracking-tight">
                R{finalInterest.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
              </h2>
            </div>

          </div>

          {/* Live SVG Graph */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
            <h4 className="font-semibold text-slate-800 text-sm mb-4">Simulated Growth Trajectory</h4>
            
            <div className="h-56 relative w-full">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full overflow-visible"
              >
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = padding + ratio * (chartHeight - padding * 2);
                  const displayValue = maxTotal * (1 - ratio);
                  return (
                    <g key={idx} className="opacity-40">
                      <line 
                        x1={padding} 
                        y1={yVal} 
                        x2={chartWidth - padding} 
                        y2={yVal} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeDasharray="4"
                      />
                      <text 
                        x={padding - 5} 
                        y={yVal + 3} 
                        textAnchor="end" 
                        fontSize="9" 
                        fontFamily="monospace" 
                        className="fill-slate-400"
                      >
                        {displayValue >= 1000000 
                          ? `R${(displayValue / 1000000).toFixed(1)}M` 
                          : `R${(displayValue / 1000).toFixed(0)}k`
                        }
                      </text>
                    </g>
                  );
                })}

                {/* Compound Growth Fill Area */}
                {chartPoints.length > 1 && (
                  <path
                    d={`${totalPath} L ${getX(chartPoints.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`}
                    fill="url(#emeraldGradient)"
                    className="opacity-15"
                  />
                )}

                {/* Lines */}
                <path 
                  d={totalPath} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
                <path 
                  d={depositPath} 
                  fill="none" 
                  stroke="#cbd5e1" 
                  strokeWidth="2.5" 
                  strokeDasharray="3" 
                  strokeLinecap="round"
                />

                {/* Year Markers at Bottom */}
                {chartPoints.map((pt, idx) => {
                  // Label every few years to keep clean
                  const shouldLabel = years <= 10 
                    ? true 
                    : years <= 20 
                    ? idx % 2 === 0 
                    : idx % 5 === 0;
                  
                  if (!shouldLabel && idx !== chartPoints.length - 1) return null;
                  
                  return (
                    <text
                      key={idx}
                      x={getX(idx)}
                      y={chartHeight - padding + 15}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      className="fill-slate-400"
                    >
                      Yr {pt.year}
                    </text>
                  );
                })}

                {/* Gradients */}
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Micro legend */}
            <div className="flex justify-center items-center space-x-6 text-xs text-slate-500 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="font-semibold text-slate-700">Total Simulated Balance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-1 bg-slate-300 border-t border-dashed border-slate-400" />
                <span className="font-semibold text-slate-700">Total Deposits Only</span>
              </div>
            </div>

          </div>

          {/* Compound Interest fun fact card */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800 text-sm block mb-1">💡 The Compounding Secret</span>
            At the end of {years} years, <strong className="text-emerald-600">R{(finalInterest / finalTotal * 100).toFixed(0)}%</strong> of your entire simulated wealth consists of interest generated from itself! That is the power of compounding—money breeding money. Moving transactional cash to savings pockets early is critical.
          </div>

        </div>

      </div>

    </div>
  );
}
