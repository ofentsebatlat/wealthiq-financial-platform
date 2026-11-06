import { useState } from "react";
import { 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  PlusCircle,
  HelpCircle,
  FileDown
} from "lucide-react";
import { Transaction } from "../types";
import { generateBankStatementPDF } from "../utils/statementGenerator";

interface TransactionsTabProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (id: string) => void;
  openAddTransactionModal: () => void;
  availableBalance: number;
  onRequestBiometricVerification: (title: string, onSuccess: () => void) => void;
  onResetToSimulatedLedger?: () => void;
}

export default function TransactionsTab({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  openAddTransactionModal,
  availableBalance,
  onRequestBiometricVerification,
  onResetToSimulatedLedger
}: TransactionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All (May - Nov 2026)");

  const categories = ["All", "Income", "Food", "Transport", "Entertainment", "Utilities", "Shopping", "Health", "Savings", "Investment", "Other"];
  const months = [
    "All (May - Nov 2026)",
    "May 2026",
    "Jun 2026",
    "Jul 2026",
    "Aug 2026",
    "Sep 2026",
    "Oct 2026",
    "Nov 2026"
  ];

  // Apply filters spanning May to November ledger
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    const matchesType = typeFilter === "All" || t.type === typeFilter;
    const matchesMonth =
      monthFilter === "All (May - Nov 2026)" ||
      (monthFilter === "May 2026" && t.date.startsWith("2026-05")) ||
      (monthFilter === "Jun 2026" && t.date.startsWith("2026-06")) ||
      (monthFilter === "Jul 2026" && t.date.startsWith("2026-07")) ||
      (monthFilter === "Aug 2026" && t.date.startsWith("2026-08")) ||
      (monthFilter === "Sep 2026" && t.date.startsWith("2026-09")) ||
      (monthFilter === "Oct 2026" && t.date.startsWith("2026-10")) ||
      (monthFilter === "Nov 2026" && t.date.startsWith("2026-11"));
    return matchesSearch && matchesCategory && matchesType && matchesMonth;
  });

  return (
    <div id="transactions-tab-content" className="p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header and Add Transaction Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical transaction records spanning May 1 to November 1, 2026.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
          {onResetToSimulatedLedger && (
            <button
              type="button"
              id="btn-load-simulated-ledger"
              onClick={onResetToSimulatedLedger}
              className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-sm px-4 py-2.5 rounded-lg border border-emerald-200 transition-all cursor-pointer shadow-3xs"
              title="Populates full simulated transaction ledger (May 1 to Nov 1)"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Load May-Nov Ledger</span>
            </button>
          )}

          <button
            id="btn-download-bank-statement"
            onClick={() => {
              onRequestBiometricVerification("Authorize Official Bank Statement Download", () => {
                generateBankStatementPDF(transactions, availableBalance);
              });
            }}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg border border-slate-200 shadow-3xs transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Download Statement (PDF)</span>
          </button>

          <button
            id="btn-add-transaction-ledger"
            onClick={openAddTransactionModal}
            className="flex items-center space-x-2 bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="transaction-search"
            type="text"
            placeholder="Search description (e.g. Woolworths, Petrol)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-capitec-blue focus:bg-white text-sm rounded-lg outline-none text-slate-700 transition"
          />
        </div>

        {/* Date Range / Month Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Period:</span>
          <select
            id="transaction-period-filter"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-700 focus:bg-white transition"
          >
            {months.map((m, i) => (
              <option key={i} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Type:</span>
          <select
            id="transaction-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-700 focus:bg-white transition"
          >
            <option value="All">All Types</option>
            <option value="income">Incomes</option>
            <option value="expense">Expenses</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Cat:</span>
          <select
            id="transaction-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none text-slate-700 focus:bg-white transition"
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Transactions Table List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  const isIncome = t.type === "income";
                  return (
                    <tr key={t.id} id={`transaction-row-${t.id}`} className="hover:bg-slate-50/70 transition">
                      
                      {/* Date */}
                      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                        {t.date}
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {t.description}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          {t.category}
                        </span>
                      </td>

                      {/* Type Indicator */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isIncome 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "bg-red-50 text-capitec-red"
                        }`}>
                          {isIncome ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{t.type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className={`px-6 py-4 text-right font-mono font-bold ${
                        isIncome ? "text-emerald-600" : "text-slate-800"
                      }`}>
                        {isIncome ? "+" : "-"}R{t.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Delete */}
                      <td className="px-6 py-4 text-center">
                        <button
                          id={`btn-delete-${t.id}`}
                          onClick={() => onDeleteTransaction(t.id)}
                          className="p-1.5 text-slate-400 hover:text-capitec-red hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                    No transactions match your search filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info showing transaction sum */}
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-700">{filteredTransactions.length}</strong> of <strong className="text-slate-700">{transactions.length}</strong> simulations
          </span>
          <div className="flex items-center space-x-4">
            <span>
              Income Sum: <strong className="text-emerald-600 font-mono">R{filteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0).toLocaleString("en-ZA")}</strong>
            </span>
            <span>
              Expense Sum: <strong className="text-capitec-red font-mono">R{filteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0).toLocaleString("en-ZA")}</strong>
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
