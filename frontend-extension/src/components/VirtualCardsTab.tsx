import { useState, FormEvent } from "react";
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Copy, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Sliders,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { VirtualCard, Transaction } from "../types";

interface VirtualCardsTabProps {
  cards: VirtualCard[];
  onAddCard: (card: Omit<VirtualCard, "id">) => void;
  onDeleteCard: (id: string) => void;
  onToggleFreeze: (id: string) => void;
  onUpdateLimits: (id: string, dailyLimit: number, monthlyLimit: number) => void;
  onAddTransaction: (tx: Omit<Transaction, "id">, cardId?: string) => void;
  availableBalance: number;
  onRequestBiometricVerification: (title: string, onSuccess: () => void) => void;
}

export default function VirtualCardsTab({
  cards,
  onAddCard,
  onDeleteCard,
  onToggleFreeze,
  onUpdateLimits,
  onAddTransaction,
  availableBalance,
  onRequestBiometricVerification
}: VirtualCardsTabProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || "");
  const [showAddForm, setShowAddForm] = useState(false);
  const [revealDetails, setRevealDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Form states for creating a new card
  const [cardType, setCardType] = useState<VirtualCard["type"]>("Virtual Debit");
  const [cardColor, setCardColor] = useState<VirtualCard["color"]>("blue");
  const [initialDailyLimit, setInitialDailyLimit] = useState(5000);
  const [initialMonthlyLimit, setInitialMonthlyLimit] = useState(15000);

  // Simulation checkout state
  const [merchant, setMerchant] = useState("Netflix South Africa");
  const [amount, setAmount] = useState(159);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  const selectedCard = cards.find(c => c.id === selectedCardId) || cards[0];

  const handleCreateCard = (e: FormEvent) => {
    e.preventDefault();
    
    // Generate a clean fake card number
    const prefix = "4431";
    const segment1 = Math.floor(1000 + Math.random() * 9000).toString();
    const segment2 = Math.floor(1000 + Math.random() * 9000).toString();
    const segment3 = Math.floor(1000 + Math.random() * 9000).toString();
    const cardNumber = `${prefix} ${segment1} ${segment2} ${segment3}`;
    
    // Expiry date (5 years from now)
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const year = String((new Date().getFullYear() + 5) % 100);
    const expiryDate = `${month}/${year}`;
    
    // Random CVV
    const cvv = Math.floor(100 + Math.random() * 900).toString();

    onAddCard({
      cardholderName: "Ofentse Batlang",
      cardNumber,
      expiryDate,
      cvv,
      type: cardType,
      color: cardColor,
      isFrozen: false,
      dailyLimit: initialDailyLimit,
      monthlyLimit: initialMonthlyLimit,
      spentThisMonth: 0
    });

    setShowAddForm(false);
    // Auto-select the newly added card if we get its id later.
    // Since id isn't returned synchronously here, we let the list update.
  };

  const handleCopyCardNumber = () => {
    if (!selectedCard) return;
    navigator.clipboard.writeText(selectedCard.cardNumber.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReveal = () => {
    if (revealDetails) {
      setRevealDetails(false);
    } else {
      onRequestBiometricVerification("Reveal Virtual Card Details", () => {
        setRevealDetails(true);
      });
    }
  };

  const handleSimulatePayment = (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    setCheckoutSuccess("");

    if (!selectedCard) {
      setCheckoutError("No active virtual card selected!");
      return;
    }

    if (selectedCard.isFrozen) {
      setCheckoutError("Transaction Declined: This virtual card is currently FROZEN. Unfreeze it to perform payments.");
      return;
    }

    if (amount <= 0) {
      setCheckoutError("Please enter a valid simulated amount!");
      return;
    }

    if (amount > availableBalance) {
      setCheckoutError(`Declined: Insufficient overall balance (Available: R${availableBalance.toLocaleString("en-ZA")}).`);
      return;
    }

    if (amount > selectedCard.dailyLimit) {
      setCheckoutError(`Declined: This transaction of R${amount} exceeds your card's Daily Limit of R${selectedCard.dailyLimit}.`);
      return;
    }

    if (selectedCard.spentThisMonth + amount > selectedCard.monthlyLimit) {
      setCheckoutError(`Declined: Exceeds card's remaining Monthly Limit of R${selectedCard.monthlyLimit - selectedCard.spentThisMonth}.`);
      return;
    }

    const processPayment = () => {
      onAddTransaction({
        date: new Date().toISOString().split("T")[0],
        description: `[Virtual Card] ${merchant}`,
        category: "Shopping",
        type: "expense",
        amount: amount
      }, selectedCard.id);

      setCheckoutSuccess(`Approved! R${amount.toFixed(2)} charged securely via virtual card. The transaction has been recorded on your main ledger.`);
      setAmount(0);
    };

    // Huge transaction protection (R2000 or more)
    if (amount >= 2000) {
      onRequestBiometricVerification(
        `Authorize R${amount.toLocaleString("en-ZA")} payment to ${merchant}`,
        processPayment
      );
    } else {
      processPayment();
    }
  };

  // Styles based on card theme
  const getCardGradient = (color: VirtualCard["color"]) => {
    switch (color) {
      case "blue":
        return "bg-gradient-to-br from-capitec-blue to-[#08426d] text-white";
      case "red":
        return "bg-gradient-to-br from-capitec-red to-[#b3000c] text-white";
      case "dark":
        return "bg-gradient-to-br from-slate-800 to-slate-950 text-slate-100 border border-slate-700/50";
      case "gold":
        return "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white";
      default:
        return "bg-gradient-to-br from-capitec-blue to-slate-800 text-white";
    }
  };

  return (
    <div id="virtual-cards-tab" className="p-8 space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight flex items-center gap-2">
            <span>My Virtual Cards</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">
              Fully Configured
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and manage custom virtual cards for secure online shopping, subscriptions, and travel expenses.
          </p>
        </div>
        
        <button
          id="btn-toggle-add-card"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center space-x-2 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer ${
            showAddForm 
              ? "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200" 
              : "bg-capitec-red hover:bg-capitec-red-dark text-white"
          }`}
        >
          <Plus className={`w-4 h-4 transition ${showAddForm ? "rotate-45 text-red-500" : ""}`} />
          <span>{showAddForm ? "Cancel Issuing" : "Create Virtual Card"}</span>
        </button>
      </div>

      {/* Issuing Form */}
      {showAddForm && (
        <form 
          id="add-card-form"
          onSubmit={handleCreateCard} 
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn"
        >
          <h3 className="text-base font-bold text-slate-800 md:col-span-4 pb-2 border-b border-slate-100">
            Issue New Capitec Virtual Card
          </h3>

          {/* Card Type */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Card Purpose</label>
            <select
              id="card-type-select"
              value={cardType}
              onChange={(e) => setCardType(e.target.value as VirtualCard["type"])}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm transition"
            >
              <option value="Virtual Debit">Virtual Debit Card (General)</option>
              <option value="Virtual Shopping">Virtual Shopping Card (Secure Stores)</option>
              <option value="Subscription Card">Subscription Card (Netflix, Spotify)</option>
              <option value="Travel Card">Travel Expenses Card (Uber, Flights)</option>
            </select>
          </div>

          {/* Card Theme Color */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Card Theme / Color</label>
            <div className="grid grid-cols-4 gap-2 h-[42px]">
              {[
                { key: "blue", class: "bg-capitec-blue border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold" },
                { key: "red", class: "bg-capitec-red border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold" },
                { key: "dark", class: "bg-slate-800 border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold" },
                { key: "gold", class: "bg-amber-600 border border-slate-300 rounded-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold" }
              ].map((colorOpt) => (
                <button
                  key={colorOpt.key}
                  type="button"
                  onClick={() => setCardColor(colorOpt.key as VirtualCard["color"])}
                  className={`${colorOpt.class} transition-all relative ${
                    cardColor === colorOpt.key ? "ring-2 ring-capitec-red scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                  title={`${colorOpt.key} theme`}
                >
                  {cardColor === colorOpt.key && "✓"}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Limit */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Daily Limit (R)</label>
            <input
              id="initial-daily-limit"
              type="number"
              min={100}
              max={50000}
              value={initialDailyLimit}
              onChange={(e) => setInitialDailyLimit(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Monthly Limit */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Limit (R)</label>
            <input
              id="initial-monthly-limit"
              type="number"
              min={500}
              max={250000}
              value={initialMonthlyLimit}
              onChange={(e) => setInitialMonthlyLimit(Number(e.target.value))}
              className="p-2.5 border border-slate-200 bg-slate-50 rounded-lg outline-none text-slate-700 focus:bg-white focus:border-capitec-blue text-sm font-mono transition"
              required
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-4 flex justify-end">
            <button
              id="btn-submit-card"
              type="submit"
              className="bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow transition cursor-pointer"
            >
              Issue Card Now
            </button>
          </div>
        </form>
      )}

      {/* Main interactive cards workspace */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Card Selector Carousel / List (4 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Virtual Card ({cards.length})
            </h3>
            
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
              {cards.map((card) => {
                const isSelected = card.id === (selectedCard?.id || "");
                return (
                  <button
                    key={card.id}
                    id={`card-selector-item-${card.id}`}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      setRevealDetails(false);
                      setCheckoutError("");
                      setCheckoutSuccess("");
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition flex justify-between items-center bg-white cursor-pointer ${
                      isSelected 
                        ? "border-capitec-red ring-1 ring-capitec-red shadow-sm" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      {/* Micro Card Icon */}
                      <div className={`w-12 h-8 rounded-md flex items-center justify-center shadow-xs font-bold text-[10px] uppercase text-white tracking-widest ${
                        card.color === "blue" ? "bg-capitec-blue" :
                        card.color === "red" ? "bg-capitec-red" :
                        card.color === "dark" ? "bg-slate-800 border border-slate-700" :
                        "bg-amber-600"
                      }`}>
                        IQ
                      </div>
                      <div className="flex flex-col">
                        <strong className="text-slate-800 text-sm leading-tight">{card.type}</strong>
                        <span className="text-slate-400 text-xs font-mono">•••• {card.cardNumber.slice(-4)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {card.isFrozen ? (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Frozen
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Active
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono font-medium mt-1">
                        Limit: R{card.dailyLimit.toLocaleString("en-ZA")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Informational advice */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 text-xs text-slate-600 space-y-2">
              <div className="flex items-start space-x-2">
                <ShieldAlert className="w-4.5 h-4.5 text-capitec-blue shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Advanced Fraud Protection</span>
                  <span>Capitec virtual cards use unique tokenization. In case of phishing or vendor leaks, delete the compromised card and issue a fresh one immediately without affecting your main debit card!</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Selected Card Showcase & Sandbox controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visualizer card itself */}
            {selectedCard && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* 3D-styled plastic Card rendering */}
                <div className="flex justify-center">
                  <div 
                    id="simulated-virtual-card-face"
                    className={`relative w-full max-w-[370px] h-[220px] rounded-2xl p-6 flex flex-col justify-between shadow-lg overflow-hidden transition-all duration-300 select-none ${getCardGradient(selectedCard.color)}`}
                  >
                    {/* Frozen frost overlay */}
                    {selectedCard.isFrozen && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-10 text-white animate-fadeIn">
                        <Lock className="w-10 h-10 text-red-500 stroke-[2.5]" />
                        <span className="font-bold tracking-wider uppercase text-xs mt-2">Card Frozen</span>
                        <span className="text-[10px] text-slate-300 mt-1 px-4 text-center">Unfreeze card below to resume transacting.</span>
                      </div>
                    )}

                    {/* Top row */}
                    <div className="flex justify-between items-start z-5">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest opacity-80 uppercase block">
                          CAPITEC
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-slate-100/95 font-sans">
                          {selectedCard.type}
                        </span>
                      </div>
                      
                      {/* Chip icon design */}
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-lg font-display tracking-tight leading-none text-white">
                          Wealth<span className="text-capitec-red">IQ</span>
                        </span>
                        <div className="w-8.5 h-6.5 bg-yellow-400/90 rounded-md border border-yellow-500/30 mt-2 relative overflow-hidden flex flex-col justify-between p-1">
                          <div className="border-b border-yellow-600/50 w-full h-1/2"></div>
                          <div className="border-r border-yellow-600/50 absolute left-1/2 top-0 bottom-0"></div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Card Number (obscured/revealed) */}
                    <div className="my-2 text-center z-5">
                      <span className="text-xl sm:text-2xl font-mono tracking-widest text-white drop-shadow-md">
                        {revealDetails 
                          ? selectedCard.cardNumber 
                          : `4431  ••••  ••••  ${selectedCard.cardNumber.slice(-4)}`
                        }
                      </span>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-between items-end z-5">
                      <div className="text-left">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Cardholder</span>
                        <span className="text-sm font-semibold tracking-wide truncate block max-w-[150px]">
                          {selectedCard.cardholderName}
                        </span>
                      </div>

                      <div className="flex space-x-6 text-right">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Expiry</span>
                          <span className="text-sm font-mono font-bold">{selectedCard.expiryDate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">CVV</span>
                          <span className="text-sm font-mono font-bold">
                            {revealDetails ? selectedCard.cvv : "•••"}
                          </span>
                        </div>
                      </div>

                      {/* Mastercard logo mockup */}
                      <div className="flex items-center space-x-[-10px] opacity-90 select-none">
                        <div className="w-7 h-7 rounded-full bg-red-500"></div>
                        <div className="w-7 h-7 rounded-full bg-amber-500 mix-blend-screen"></div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Card Action Quickbuttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    id="btn-toggle-reveal-details"
                    onClick={handleToggleReveal}
                    className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  >
                    {revealDetails ? (
                      <>
                        <EyeOff className="w-4 h-4 text-slate-500" />
                        <span>Hide Details</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-capitec-blue" />
                        <span>Reveal Info</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-copy-card-number"
                    onClick={handleCopyCardNumber}
                    className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{copied ? "Copied!" : "Copy Number"}</span>
                  </button>

                  <button
                    id={`btn-freeze-card-${selectedCard.id}`}
                    onClick={() => onToggleFreeze(selectedCard.id)}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      selectedCard.isFrozen 
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" 
                        : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                    }`}
                  >
                    {selectedCard.isFrozen ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unfreeze Card</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Freeze Card</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Card limit adjusting section */}
                <div className="border-t border-slate-100 pt-5 space-y-4 text-left">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sliders className="w-4.5 h-4.5 text-capitec-blue" />
                    <span>Manage Card Security Limits</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily limit slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Daily Limit</span>
                        <span className="font-mono text-slate-800">R{selectedCard.dailyLimit.toLocaleString("en-ZA")}</span>
                      </div>
                      <input
                        id="card-daily-limit-slider"
                        type="range"
                        min={500}
                        max={30000}
                        step={500}
                        value={selectedCard.dailyLimit}
                        onChange={(e) => onUpdateLimits(selectedCard.id, Number(e.target.value), selectedCard.monthlyLimit)}
                        className="w-full h-1.5 bg-slate-100 accent-capitec-red rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block">Restricts single-day maximum spend.</span>
                    </div>

                    {/* Monthly limit slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Monthly Limit</span>
                        <span className="font-mono text-slate-800">R{selectedCard.monthlyLimit.toLocaleString("en-ZA")}</span>
                      </div>
                      <input
                        id="card-monthly-limit-slider"
                        type="range"
                        min={1000}
                        max={100000}
                        step={1000}
                        value={selectedCard.monthlyLimit}
                        onChange={(e) => onUpdateLimits(selectedCard.id, selectedCard.dailyLimit, Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 accent-capitec-blue rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block">Remaining: R{(selectedCard.monthlyLimit - selectedCard.spentThisMonth).toLocaleString("en-ZA")}</span>
                    </div>
                  </div>
                </div>

                {/* Sandbox Payment Simulator inside Card */}
                <div className="border-t border-slate-100 pt-5 space-y-3.5 text-left">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-capitec-red" />
                    <h4 className="text-sm font-bold text-slate-800">Card Sandbox Payment Tester</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight">
                    Simulate paying with this specific virtual card. Approved transactions will decrement your virtual card limit and main account balances dynamically.
                  </p>

                  <form onSubmit={handleSimulatePayment} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Merchant</span>
                      <select
                        id="sim-merchant"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 focus:bg-white transition text-slate-700"
                      >
                        <option value="Netflix South Africa">Netflix South Africa</option>
                        <option value="Spotify Premium SA">Spotify Premium SA</option>
                        <option value="Woolworths Online">Woolworths Online Store</option>
                        <option value="Uber South Africa">Uber SA Ride</option>
                        <option value="Takealot Online">Takealot.com SA</option>
                        <option value="Eskom Prepaid">Prepaid Electricity</option>
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Amount (ZAR)</span>
                      <input
                        id="sim-amount"
                        type="number"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="ZAR Amount"
                        className="p-2 border border-slate-200 rounded-lg text-xs font-mono outline-none bg-slate-50 focus:bg-white transition text-slate-700"
                        required
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        id="btn-simulate-payment"
                        type="submit"
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer shadow-3xs"
                      >
                        <span>Swipe Card</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {/* Feedback Logs */}
                  {checkoutError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium flex items-start gap-1.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {checkoutSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-medium flex items-start gap-1.5 animate-fadeIn">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      <span>{checkoutSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Footnotes - Card Deletion */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-medium italic">
                    Type: {selectedCard.type}
                  </span>
                  <button
                    id="btn-delete-card"
                    onClick={() => {
                      if (confirm("Are you sure you want to permanently cancel this virtual card?")) {
                        onDeleteCard(selectedCard.id);
                        setSelectedCardId("");
                      }
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 text-slate-400 hover:text-capitec-red hover:bg-red-50 rounded-md transition text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Card</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-4">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-lg">No Active Virtual Cards</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You currently have no custom digital cards configured. Create one securely above for online shopping or travel!
          </p>
          <button
            id="btn-init-card-empty"
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white rounded-lg text-sm font-semibold shadow transition cursor-pointer"
          >
            Create Your First Virtual Card
          </button>
        </div>
      )}

    </div>
  );
}
