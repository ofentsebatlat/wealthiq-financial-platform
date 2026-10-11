import React, { useState, useEffect, useRef } from "react";
import { 
  PiggyBank, 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Coins, 
  HelpCircle, 
  ScanFace,
  Percent,
  Calendar,
  Sparkles,
  Clock
} from "lucide-react";
import { SavingsPocket, Transaction } from "../types";

interface SavingsTabProps {
  savingsPockets: SavingsPocket[];
  availableBalance: number;
  onAddPocket: (pocket: Omit<SavingsPocket, "id">) => void;
  onDeletePocket: (id: string) => void;
  onTransferBetweenAccounts: (
    fromPocketId: string | "main", 
    toPocketId: string | "main", 
    amount: number
  ) => void;
  onRequestBiometricVerification: (title: string, onSuccess: () => void) => void;
  transactions: Transaction[];
  onSimulateTimePassage: () => void;
}

export default function SavingsTab({
  savingsPockets,
  availableBalance,
  onAddPocket,
  onDeletePocket,
  onTransferBetweenAccounts,
  onRequestBiometricVerification,
  transactions,
  onSimulateTimePassage
}: SavingsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pocketName, setPocketName] = useState("");
  const [targetAmount, setTargetAmount] = useState(10000);
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState<SavingsPocket["category"]>("General");
  const [autoRoundUp, setAutoRoundUp] = useState(false);
  const [roundUpAmount, setRoundUpAmount] = useState(20);

  // Transfer states
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFrom, setTransferFrom] = useState<string | "main">("main");
  const [transferTo, setTransferTo] = useState<string | "main">("");
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  // Live Interest Accrual State
  const [liveInterest, setLiveInterest] = useState(0);
  const interestTickerRef = useRef<number | null>(null);

  // Calculate total savings
  const totalSavings = savingsPockets.reduce((sum, p) => sum + p.balance, 0);

  // Pre-seed some default selection for transfers
  useEffect(() => {
    if (savingsPockets.length > 0 && !transferTo) {
      // Find first pocket that isn't selected as "from"
      const firstPocket = savingsPockets[0].id;
      setTransferTo(firstPocket);
    }
  }, [savingsPockets, transferTo]);

  // Real-time interest accrual tick simulator
  // Accrues actual interest live on screen!
  useEffect(() => {
    if (savingsPockets.length === 0) {
      setLiveInterest(0);
      return;
    }

    const calcLiveInterest = () => {
      const now = Date.now();
      let totalPending = 0;

      savingsPockets.forEach(pocket => {
        const lastPayout = pocket.lastInterestPayoutTime || now;
        const accumulated = pocket.accumulatedInterest || 0;
        const elapsedSeconds = (now - lastPayout) / 1000;
        const apy = pocket.interestRate / 100;
        const earned = pocket.balance * apy * (elapsedSeconds / (365 * 24 * 60 * 60));
        
        totalPending += accumulated + earned;
      });

      return totalPending;
    };

    // Update immediately
    setLiveInterest(calcLiveInterest());

    const interval = setInterval(() => {
      setLiveInterest(calcLiveInterest());
    }, 100);

    return () => clearInterval(interval);
  }, [savingsPockets]);

  const handleCreatePocket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocketName.trim()) return;

    // Capitec gives higher rates for longer goals or specific categories
    const baseRate = 5.75;
    const categoryPremium = category === "Emergency" ? 0.75 : category === "Property" ? 1.15 : 0.45;
    const finalRate = parseFloat((baseRate + categoryPremium).toFixed(2));

    onAddPocket({
      name: pocketName,
      balance: 0,
      targetAmount,
      targetDate: targetDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      interestRate: finalRate,
      category,
      dateCreated: new Date().toISOString().split("T")[0],
      autoRoundUp,
      roundUpAmount
    });

    setPocketName("");
    setTargetAmount(10000);
    setTargetDate("");
    setShowAddForm(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    setTransferSuccess("");

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Please enter a valid transfer amount.");
      return;
    }

    if (transferFrom === transferTo) {
      setTransferError("Source and destination accounts must be different.");
      return;
    }

    // Balance checks
    if (transferFrom === "main") {
      if (amount > availableBalance) {
        setTransferError(`Insufficient funds in main transactional account. Available: R${availableBalance.toLocaleString("en-ZA")}`);
        return;
      }
    } else {
      const sourcePocket = savingsPockets.find(p => p.id === transferFrom);
      if (!sourcePocket || amount > sourcePocket.balance) {
        setTransferError(`Insufficient funds in savings pocket: ${sourcePocket?.name || ""}. Available: R${(sourcePocket?.balance || 0).toLocaleString("en-ZA")}`);
        return;
      }
    }

    // Execute transfer after optionally verifying biometrics if amount >= R2,000
    const executeTransfer = () => {
      onTransferBetweenAccounts(transferFrom, transferTo, amount);
      setTransferSuccess(`Successfully transferred R${amount.toLocaleString("en-ZA")}! Your balances have been updated instantly.`);
      setTransferAmount("");
    };

    if (amount >= 2000) {
      const fromLabel = transferFrom === "main" ? "Main Savings Account" : savingsPockets.find(p => p.id === transferFrom)?.name || "Pocket";
      const toLabel = transferTo === "main" ? "Main Savings Account" : savingsPockets.find(p => p.id === transferTo)?.name || "Pocket";
      onRequestBiometricVerification(
        `Authorize R${amount.toLocaleString("en-ZA")} Savings Transfer from ${fromLabel} to ${toLabel}`,
        executeTransfer
      );
    } else {
      executeTransfer();
    }
  };

  const getCategoryColor = (cat: SavingsPocket["category"]) => {
    switch (cat) {
      case "Emergency": return "text-red-500 bg-red-50 border-red-200";
      case "Holiday": return "text-amber-500 bg-amber-50 border-amber-200";
      case "Property": return "text-emerald-500 bg-emerald-50 border-emerald-200";
      case "Education": return "text-blue-500 bg-blue-50 border-blue-200";
      case "Vehicle": return "text-indigo-500 bg-indigo-50 border-indigo-200";
      default: return "text-slate-500 bg-slate-50 border-slate-200";
    }
  };

  // Find simulated round up transactions
  const roundedTransactions = transactions
    .filter(t => t.type === "expense" && t.category !== "Investment" && t.category !== "Savings")
    .map(t => {
      const amt = t.amount;
      // Calculate round up spare change to nearest R20
      const nextMultiple = Math.ceil(amt / 20) * 20;
      const spareChange = parseFloat((nextMultiple - amt).toFixed(2));
      return {
        ...t,
        roundedTo: nextMultiple,
        spareChange
      };
    })
    .filter(t => t.spareChange > 0)
    .slice(0, 4);

  const totalSpareChangeSimulation = roundedTransactions.reduce((sum, t) => sum + t.spareChange, 0);

  return (
    <div id="savings-tab-content" className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight flex items-center gap-2.5">
            <PiggyBank className="w-8 h-8 text-capitec-blue shrink-0" />
            <span>Savings & Pockets</span>
            <span className="bg-capitec-blue/10 text-capitec-blue text-xs px-2.5 py-1 rounded-full font-semibold">
              Live Interest Active
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create multi-pocket savings goals, earn competitive high interest, and grow your wealth automatically.
          </p>
        </div>

        <button
          id="btn-toggle-add-pocket"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center space-x-2 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer ${
            showAddForm 
              ? "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200" 
              : "bg-capitec-blue hover:bg-capitec-blue-light text-white"
          }`}
        >
          <Plus className={`w-4 h-4 transition ${showAddForm ? "rotate-45 text-red-500" : ""}`} />
          <span>{showAddForm ? "Cancel Pocket" : "Create Savings Pocket"}</span>
        </button>
      </div>

      {/* Live Interest Accrual Hero Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-[#08426d] to-capitec-blue text-white rounded-2xl p-6 shadow-md border border-white/5 relative overflow-hidden">
        {/* Floating background icon */}
        <Coins className="absolute -right-10 -bottom-10 w-44 h-44 text-white/5 rotate-12 pointer-events-none" />
        
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-300">Live Interest Accumulation Engine</span>
          </div>
          
          <div className="space-y-1">
            <span className="text-[11px] text-slate-300 block">Total Combined Savings (Across Pockets)</span>
            <h2 className="text-4xl font-extrabold font-mono tracking-tight text-white">
              R{totalSavings.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-slate-300">Interest Accruing Rate:</span>
              <span className="font-bold font-mono ml-1.5 text-emerald-300">Up to 7.65% APY</span>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-slate-300">Remote Verification Status:</span>
              <span className="font-bold ml-1.5 text-emerald-300 flex inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> Biometrics Secured
              </span>
            </div>
          </div>
        </div>

        {/* Live Interest Accrued Counter Box */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-200 uppercase tracking-wider font-semibold">Live Interest Earned</span>
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          </div>

          <div className="my-3">
            <div className="text-3xl font-bold font-mono text-emerald-300 tracking-tight">
              R{liveInterest.toFixed(6)}
            </div>
            <span className="text-[9px] text-slate-300 italic">Increments live in real-time second-by-second</span>
          </div>

          <div className="text-[10px] text-slate-300 border-t border-white/10 pt-2 flex items-center justify-between">
            <span>Interest Paid Cycle:</span>
            <span className="font-semibold font-mono text-emerald-300">Every 7 Days</span>
          </div>
        </div>
      </div>

      {/* 7-Day Background Deposit Info & Fast Forward Panel */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div className="space-y-1.5 md:max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Clock className="w-4 h-4 text-capitec-orange shrink-0 animate-spin-slow" />
            <h4 className="font-bold text-slate-800 text-sm font-display">Automated 7-Day Interest Deposit Engine</h4>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
              Background Active
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your savings pockets accrue interest in real time. Even when the application is closed or running in the background, the elapsed real time is recorded. Every <strong>7 days</strong>, your accrued interest is automatically paid out into your Main Transactional Account and printed on your bank statement.
          </p>
        </div>
        
        <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            id="btn-simulate-7-days"
            type="button"
            onClick={onSimulateTimePassage}
            className="flex items-center justify-center space-x-2 bg-capitec-orange hover:bg-capitec-orange-light text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer group active:scale-95"
          >
            <Clock className="w-3.5 h-3.5 transition group-hover:rotate-180" />
            <span>Simulate 7-Day Passage & Payout</span>
          </button>
        </div>
      </div>

      {/* Pocket Issuing Form */}
      {showAddForm && (
        <form 
          id="add-pocket-form"
          onSubmit={handleCreatePocket} 
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn text-left"
        >
          <h3 className="text-base font-bold text-slate-800 md:col-span-3 pb-2 border-b border-slate-100">
            Open a New Goal-Driven Savings Pocket
          </h3>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Pocket Goal Name</label>
            <input
              id="pocket-name-input"
              type="text"
              value={pocketName}
              onChange={(e) => setPocketName(e.target.value)}
              placeholder="e.g. Cape Town Flat Deposit, Festive Car Pocket"
              className="p-2.5 border border-slate-200 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
              required
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Goal Category</label>
            <select
              id="pocket-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as SavingsPocket["category"])}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
            >
              <option value="Emergency">Emergency Fund (+0.75% Premium)</option>
              <option value="Holiday">Holiday & Travel (+0.45% Premium)</option>
              <option value="Property">Property & Housing (+1.15% Premium)</option>
              <option value="Education">Education & Tuition (+0.45% Premium)</option>
              <option value="Vehicle">Vehicle & Transport (+0.45% Premium)</option>
              <option value="General">General Savings Pocket (Standard)</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Target Target (ZAR)</label>
            <input
              id="pocket-target-amount"
              type="number"
              min={100}
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="p-2.5 border border-slate-200 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Target Completion Date</label>
            <input
              id="pocket-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="p-2.5 border border-slate-200 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
            />
          </div>

          <div className="flex items-center space-x-3.5 md:col-span-2 pt-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRoundUp}
                onChange={(e) => setAutoRoundUp(e.target.checked)}
                className="w-4.5 h-4.5 rounded text-capitec-blue border-slate-300 focus:ring-capitec-blue transition"
              />
              <span>Activate Live-Save Round-Up for this pocket</span>
            </label>
            {autoRoundUp && (
              <select
                value={roundUpAmount}
                onChange={(e) => setRoundUpAmount(Number(e.target.value))}
                className="p-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 text-slate-700"
              >
                <option value={10}>Nearest R10</option>
                <option value={20}>Nearest R20</option>
                <option value={50}>Nearest R50</option>
              </select>
            )}
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              id="btn-submit-pocket"
              type="submit"
              className="bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow transition cursor-pointer"
            >
              Issue Pocket Now
            </button>
          </div>
        </form>
      )}

      {/* Main interactive split workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANEL: Savings Pockets Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Flexible pockets ({savingsPockets.length})
          </h3>

          {savingsPockets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {savingsPockets.map((pocket) => {
                const progressPercentage = Math.min(100, (pocket.balance / pocket.targetAmount) * 100);
                return (
                  <div 
                    key={pocket.id}
                    id={`pocket-card-${pocket.id}`}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-capitec-blue transition flex flex-col justify-between h-[230px] relative shadow-2xs group"
                  >
                    <div>
                      {/* Top Row: Category and Interest Rate */}
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getCategoryColor(pocket.category)}`}>
                          {pocket.category}
                        </span>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-0.5" title="Annual Percentage Yield interest rate">
                          <Percent className="w-3 h-3 text-capitec-blue" />
                          <span>{pocket.interestRate}%</span>
                        </span>
                      </div>

                      {/* Pocket title */}
                      <h4 className="font-bold text-slate-800 text-sm leading-tight text-left group-hover:text-capitec-blue transition">
                        {pocket.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono text-left mt-0.5">Created: {pocket.dateCreated}</p>

                      {/* Current Pocket Balance */}
                      <div className="my-3.5 text-left">
                        <span className="text-[10px] text-slate-400 block font-medium">Pocket Balance</span>
                        <strong className="text-xl font-mono text-slate-800 font-bold block">
                          R{pocket.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    {/* Progress tracking and cancel pocket option */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                        <span>{progressPercentage.toFixed(0)}% saved</span>
                        <span>Goal: R{pocket.targetAmount.toLocaleString("en-ZA")}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${progressPercentage}%` }}
                          className="bg-capitec-blue h-full rounded-full transition-all duration-500"
                        />
                      </div>

                      {/* Bottom pocket status & delete option */}
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                        {pocket.autoRoundUp ? (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            Round Up Active (R{pocket.roundUpAmount})
                          </span>
                        ) : (
                          <span className="text-[9px] italic">No auto-roundups</span>
                        )}

                        <button
                          id={`btn-delete-pocket-${pocket.id}`}
                          onClick={() => {
                            if (confirm(`Are you sure you want to cancel the pocket "${pocket.name}"? Any remaining balance will be transferred back to your transactional account instantly.`)) {
                              onDeletePocket(pocket.id);
                            }
                          }}
                          className="text-slate-300 hover:text-capitec-red transition flex items-center gap-0.5 cursor-pointer font-bold uppercase text-[9px] p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Close Pocket</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-4">
              <PiggyBank className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-lg">No Active Savings pockets</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Issue a custom high-interest pocket to separate funds for emergencies, holiday, or housing.
              </p>
              <button
                id="btn-add-pocket-empty"
                onClick={() => setShowAddForm(true)}
                className="px-5 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white rounded-lg text-sm font-semibold shadow transition cursor-pointer"
              >
                Create Your First Pocket
              </button>
            </div>
          )}

          {/* Automatic Round-Up Rules Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-left space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-800 text-sm">Capitec Live-Save™ Automated Round-Up</h4>
              </div>
              <span className="text-[9px] uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                Simulated Feature
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Whenever you make a virtual card purchase or transactional payment, the Capitec secure banking core will automatically round up your spent amount to your selected multiple. The difference is transferred silently into your savings.
            </p>

            {/* Simulation breakdown list of past transactions rounded */}
            <div className="space-y-2.5 bg-slate-50 border border-slate-100 rounded-lg p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spare Change Simulation Log</span>
              
              <div className="divide-y divide-slate-100 space-y-2">
                {roundedTransactions.map((t, i) => (
                  <div key={i} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                    <div className="text-left">
                      <strong className="text-slate-700 block font-semibold">{t.description}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">Original Spent: R{t.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600 block">+R{t.spareChange.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Rounded to R{t.roundedTo}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-slate-200/60 pt-3 text-xs mt-3">
                <span className="font-bold text-slate-700">Total Round-Up Spare Change (Jul 2026):</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">R{totalSpareChangeSimulation.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Quick Transfer / Account Interchange Tool (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ArrowLeftRight className="w-5 h-5 text-capitec-blue" />
              <h4 className="font-bold text-slate-800 text-sm">Instant Savings Transfer tool</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Perform instant transfers between your main transactional account and flexible savings pockets.
            </p>

            {/* Error / Success Logs */}
            {transferError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium flex items-start gap-1.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{transferError}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-medium flex items-start gap-1.5 animate-fadeIn">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{transferSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-left">
              
              {/* FROM Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Transfer From (Source)</label>
                <select
                  id="transfer-from-select"
                  value={transferFrom}
                  onChange={(e) => {
                    setTransferFrom(e.target.value);
                    setTransferError("");
                    setTransferSuccess("");
                  }}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-xs transition"
                >
                  <option value="main">Main Transactional Account (ZAR R{availableBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })})</option>
                  {savingsPockets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} pocket (ZAR R{p.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })})</option>
                  ))}
                </select>
              </div>

              {/* TO Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Transfer To (Destination)</label>
                <select
                  id="transfer-to-select"
                  value={transferTo}
                  onChange={(e) => {
                    setTransferTo(e.target.value);
                    setTransferError("");
                    setTransferSuccess("");
                  }}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-xs transition"
                >
                  {transferFrom !== "main" && (
                    <option value="main">Main Transactional Account (ZAR R{availableBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })})</option>
                  )}
                  {savingsPockets
                    .filter(p => p.id !== transferFrom)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} pocket (ZAR R{p.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })})</option>
                    ))}
                </select>
              </div>

              {/* Amount input */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">ZAR Transfer Amount (R)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R</span>
                  <input
                    id="transfer-amount-input"
                    type="number"
                    min={1}
                    value={transferAmount}
                    onChange={(e) => {
                      setTransferAmount(e.target.value);
                      setTransferError("");
                      setTransferSuccess("");
                    }}
                    placeholder="e.g. 500"
                    className="p-2.5 pl-7 border border-slate-200 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-xs font-mono transition w-full"
                    required
                  />
                </div>
                <span className="text-[9px] text-slate-400 block italic leading-tight">
                  💡 Note: Real security protocol requires face capture verification for all savings transfers of R2,000 or more!
                </span>
              </div>

              {/* Submit btn */}
              <button
                id="btn-submit-transfer"
                type="submit"
                disabled={savingsPockets.length === 0}
                className="w-full py-2.5 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-3xs"
              >
                <span>Execute Interchange</span>
              </button>

            </form>
          </div>

          {/* Secure compliance advice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 text-xs text-slate-600 space-y-3">
            <div className="flex items-start space-x-2">
              <ScanFace className="w-5 h-5 text-capitec-blue shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">SABRIC Remote Token Protection</span>
                <span className="leading-relaxed">To safeguard against social engineering and unauthorized cash outflows, instant pocket redemptions are monitored. Transfers exceeding the R2,000 threshold will request immediate face matching.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
