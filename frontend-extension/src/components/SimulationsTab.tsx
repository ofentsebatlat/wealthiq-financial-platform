import { useState, FormEvent } from "react";
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle, 
  ArrowRight,
  Shield,
  Home,
  Car,
  Plane,
  X
} from "lucide-react";
import { SimulationGoal } from "../types";

interface SimulationsTabProps {
  goals: SimulationGoal[];
  onAddGoal: (goal: Omit<SimulationGoal, "id">) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateSaved: (id: string, amount: number) => void;
}

export default function SimulationsTab({
  goals,
  onAddGoal,
  onDeleteGoal,
  onUpdateSaved
}: SimulationsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState(150000);
  const [currentSaved, setCurrentSaved] = useState(15000);
  const [monthlyContribution, setMonthlyContribution] = useState(2500);
  const [category, setCategory] = useState<SimulationGoal["category"]>("Car");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddGoal({
      name,
      targetAmount,
      currentSaved,
      monthlyContribution,
      interestRate: 6.5, // Standard simulated rate
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split("T")[0], // Default 2 years out
      category
    });
    setName("");
    setShowAddForm(false);
  };

  const getCategoryIcon = (cat: SimulationGoal["category"]) => {
    switch (cat) {
      case "Car": return <Car className="w-5 h-5 text-indigo-500" />;
      case "House": return <Home className="w-5 h-5 text-orange-500" />;
      case "Emergency Fund": return <Shield className="w-5 h-5 text-emerald-500" />;
      case "Travel": return <Plane className="w-5 h-5 text-sky-500" />;
      default: return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div id="simulations-tab-content" className="p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
            Financial Goal Simulations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build milestone scenarios. Track progress timelines to purchase assets or erase debt securely.
          </p>
        </div>
        <button
          id="btn-toggle-add-goal"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center space-x-2 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer ${
            showAddForm 
              ? "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200" 
              : "bg-capitec-red hover:bg-capitec-red-dark text-white"
          }`}
        >
          <Plus className={`w-4 h-4 transition ${showAddForm ? "rotate-45 text-red-500" : ""}`} />
          <span>{showAddForm ? "Cancel Simulation" : "Model New Goal"}</span>
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <form 
          id="add-goal-form"
          onSubmit={handleSubmit} 
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn"
        >
          <h3 className="text-base font-bold text-slate-800 md:col-span-3 pb-2 border-b border-slate-100">
            Design Future Milestone Simulation
          </h3>

          {/* Name */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Goal Title</label>
            <input
              id="goal-name"
              type="text"
              placeholder="e.g. Cape Town Trip, House Deposit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
              required
            />
          </div>

          {/* Category */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Category Focus</label>
            <select
              id="goal-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SimulationGoal["category"])}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
            >
              <option value="Car">Vehicles / Transport</option>
              <option value="House">Property / Rent deposit</option>
              <option value="Emergency Fund">Emergency reserve</option>
              <option value="Travel">Vacations / Flights</option>
              <option value="Other">Other targets</option>
            </select>
          </div>

          {/* Target Amount */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Required Cost (R)</label>
            <input
              id="goal-target"
              type="number"
              min={1}
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Current Saved */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Current Funds (R)</label>
            <input
              id="goal-current"
              type="number"
              min={0}
              value={currentSaved}
              onChange={(e) => setCurrentSaved(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Monthly Contribution */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Savings Allocation (R)</label>
            <input
              id="goal-monthly"
              type="number"
              min={0}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              id="btn-submit-goal"
              type="submit"
              className="w-full bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-sm py-2.5 rounded-lg shadow transition-all cursor-pointer"
            >
              Initialize Goal Path
            </button>
          </div>
        </form>
      )}

      {/* Grid of Active Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const percentage = Math.min((goal.currentSaved / goal.targetAmount) * 100, 100);
            
            // Calculate remaining months left
            const remainingCost = goal.targetAmount - goal.currentSaved;
            const monthsLeft = goal.monthlyContribution > 0 
              ? Math.ceil(remainingCost / goal.monthlyContribution) 
              : Infinity;

            return (
              <div 
                key={goal.id} 
                id={`goal-card-${goal.id}`}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow transition"
              >
                <div>
                  
                  {/* Top line with Category icon & Delete */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-slate-100 rounded-lg">
                        {getCategoryIcon(goal.category)}
                      </div>
                      <div className="flex flex-col text-left">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{goal.name}</h3>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{goal.category}</span>
                      </div>
                    </div>
                    <button
                      id={`btn-del-goal-${goal.id}`}
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-capitec-red hover:bg-red-50 rounded-lg transition"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Pricing metrics */}
                  <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-4 my-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Goal Size</span>
                      <strong className="text-slate-700 text-sm font-mono">R{goal.targetAmount.toLocaleString("en-ZA")}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Accumulated</span>
                      <strong className="text-slate-700 text-sm font-mono">R{goal.currentSaved.toLocaleString("en-ZA")}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Monthly Pay</span>
                      <strong className="text-emerald-600 text-sm font-mono">R{goal.monthlyContribution.toLocaleString("en-ZA")}</strong>
                    </div>
                  </div>

                  {/* Progress Slider Bar */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Completion Path</span>
                      <span className="text-capitec-blue">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-capitec-red rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                </div>

                {/* Simulated remaining timing guidance footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-baseline gap-2">
                  <div className="text-left text-xs text-slate-500">
                    {monthsLeft === Infinity ? (
                      <span className="text-amber-600 font-medium">Please add monthly contributions to start path!</span>
                    ) : percentage >= 100 ? (
                      <span className="text-emerald-600 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Simulated Goal Reached! Ready to fund.</span>
                      </span>
                    ) : (
                      <span>Estimated time left: <strong className="text-slate-800">{monthsLeft} months</strong> ({ (monthsLeft / 12).toFixed(1) } Yrs)</span>
                    )}
                  </div>
                  
                  {/* Actionable simulated tips */}
                  {percentage < 100 && goal.monthlyContribution > 0 && (
                    <div className="text-[11px] text-capitec-blue font-semibold bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100 mt-1 sm:mt-0">
                      💡 Bump monthly by <strong className="font-mono">R500</strong> to reach <strong className="font-mono">{Math.max(1, Math.ceil(remainingCost / (goal.monthlyContribution + 500)))}</strong> months sooner!
                    </div>
                  )}
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 italic">
            No active goal simulations. Try setting up a property deposit or travel goal using the button above!
          </div>
        )}
      </div>

    </div>
  );
}
