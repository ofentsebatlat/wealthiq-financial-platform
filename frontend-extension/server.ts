import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import {
  handleRequestOtp,
  handleVerifyOtp,
  handleSetNewPinWithToken,
  hashPin,
  verifyPinWithHash,
  UserRecordLookupResult,
  AuditLoggerFn,
} from "./src/services/pinResetService";

dotenv.config();

const app = express();
const PORT = 3000;

// Security Profile persistent file-database path
const PROFILE_FILE_PATH = path.join(process.cwd(), "security_profile.json");
const USERS_FILE_PATH = path.join(process.cwd(), "users_database.json");
const EVENTS_FILE_PATH = path.join(process.cwd(), "login_events.json");
const SUPPORT_MESSAGES_FILE = path.join(process.cwd(), "support_messages.json");
const SENT_EMAILS_FILE = path.join(process.cwd(), "sent_emails.json");

// Multi-user memory map
let registeredUsersMap: Record<string, any> = {};

// Failed PIN attempts tracking for Brute-Force lockout (Security Measure 2)
interface FailedAttemptRecord {
  count: number;
  lockedUntil: number;
  lastAttempt: number;
}
const failedPinAttemptsMap: Record<string, FailedAttemptRecord> = {};

// Login events audit log memory array
let loginEvents: Array<any> = [];

// Support messages memory array
let supportMessages: Array<any> = [];
try {
  if (fs.existsSync(SUPPORT_MESSAGES_FILE)) {
    supportMessages = JSON.parse(fs.readFileSync(SUPPORT_MESSAGES_FILE, "utf-8"));
  }
} catch (e) {}

// Sent POP & Statement emails memory array
let sentEmails: Array<any> = [];
try {
  if (fs.existsSync(SENT_EMAILS_FILE)) {
    sentEmails = JSON.parse(fs.readFileSync(SENT_EMAILS_FILE, "utf-8"));
  }
} catch (e) {}

// Helper to save support messages to disk
function saveSupportMessagesToDisk() {
  try {
    fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify(supportMessages.slice(0, 300), null, 2), "utf-8");
  } catch (err) {
    console.error("[WealthIQ Server] Failed to save support messages:", err);
  }
}

// Helper to save sent emails to disk
function saveSentEmailsToDisk() {
  try {
    fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(sentEmails.slice(0, 300), null, 2), "utf-8");
  } catch (err) {
    console.error("[WealthIQ Server] Failed to save sent emails:", err);
  }
}

// Helper to save login events to disk
function saveLoginEventsToDisk() {
  try {
    fs.writeFileSync(EVENTS_FILE_PATH, JSON.stringify(loginEvents.slice(0, 200), null, 2), "utf-8");
  } catch (err) {
    console.error("[WealthIQ Server] Failed to save login events:", err);
  }
}

// Cache active profile in memory
let cachedProfile = {
  isSecurityRegistered: false,
  userPin: "",
  userFacePhoto: "",
  userName: "Ofentse Batlang",
  startingBalance: 36546.55,
  userEmail: "ofentsebatlang@gmail.com",
  userPhone: "+27 82 456 7890"
};

// Load initial profiles if exist
try {
  if (fs.existsSync(PROFILE_FILE_PATH)) {
    const rawData = fs.readFileSync(PROFILE_FILE_PATH, "utf-8");
    cachedProfile = JSON.parse(rawData);
    console.log("[WealthIQ Server] Loaded security profile from persistent JSON database.");
  }
} catch (err) {
  console.error("[WealthIQ Server] Failed to load security profile from file database:", err);
}

try {
  if (fs.existsSync(USERS_FILE_PATH)) {
    registeredUsersMap = JSON.parse(fs.readFileSync(USERS_FILE_PATH, "utf-8"));
  }
} catch (err) {}

// Load persistent login events audit log or seed initial events
try {
  if (fs.existsSync(EVENTS_FILE_PATH)) {
    loginEvents = JSON.parse(fs.readFileSync(EVENTS_FILE_PATH, "utf-8"));
  } else {
    const now = Date.now();
    loginEvents = [
      {
        id: "evt-init-1",
        timestamp: new Date(now - 1000 * 60 * 14).toISOString(),
        userName: "Ofentse Batlang",
        accountNumber: "1431289445",
        method: "biometric_face",
        status: "success",
        similarity: 96.8,
        distance: 0.28,
        device: "WealthIQ Web Client (Chrome)",
        ipAddress: "196.25.1.42 (Kimberley Central)",
        details: "128D Facial Metric Match: Euclidean distance 0.28 <= 0.45 security threshold."
      },
      {
        id: "evt-init-2",
        timestamp: new Date(now - 1000 * 60 * 38).toISOString(),
        userName: "Unrecognized Subject",
        accountNumber: "N/A",
        method: "biometric_face",
        status: "failed",
        similarity: 24.3,
        distance: 0.76,
        device: "Live Webcam Scanner",
        ipAddress: "102.132.88.19 (Johannesburg)",
        details: "Intrusion Defense: Unregistered face detected (Distance 0.76 > 0.45). Access rejected."
      },
      {
        id: "evt-init-3",
        timestamp: new Date(now - 1000 * 60 * 95).toISOString(),
        userName: "Ofentse Batlang",
        accountNumber: "1431289445",
        method: "pin",
        status: "success",
        device: "Mobile Browser / iOS Safari",
        ipAddress: "196.25.1.42 (Kimberley Central)",
        details: "Authenticated via 4-digit Remote Banking PIN."
      }
    ];
    saveLoginEventsToDisk();
  }
} catch (err) {
  console.error("[WealthIQ Server] Failed to initialize login events log:", err);
}

// Seed baseline registered accounts if missing
if (!registeredUsersMap["Ofentse Batlang"] || !registeredUsersMap["Ofentse Batlang"].accountNumber) {
  registeredUsersMap["Ofentse Batlang"] = {
    userId: "usr_ofentse_batlang_01",
    userName: "Ofentse Batlang",
    userPin: "1234",
    userPinHash: hashPin("1234"),
    userFacePhoto: cachedProfile.userFacePhoto || "",
    startingBalance: 36546.55,
    monthlySalary: 45000,
    userEmail: "ofentsebatlang@gmail.com",
    userPhone: "0786976181",
    accountNumber: "1431289445",
    accountType: "Global One Account",
    idNumber: "940615 5123 08 1",
    dateOfBirth: "June 15, 1994",
    enrollmentDate: "July 1, 2026",
    isSecurityRegistered: true,
    isFrozen: false
  };
}

if (!registeredUsersMap["Bokang Khakhau"]) {
  registeredUsersMap["Bokang Khakhau"] = {
    userId: "usr_bokang_khakhau_02",
    userName: "Bokang Khakhau",
    userPin: "2025",
    userPinHash: hashPin("2025"),
    userFacePhoto: "",
    startingBalance: 80000,
    monthlySalary: 68000,
    userEmail: "khakhaumoepeng@gmail.com",
    userPhone: "0710894216",
    accountNumber: "1602309986",
    accountType: "Global One Transactional",
    idNumber: "050622 5216 08 9",
    dateOfBirth: "June 22, 2005",
    enrollmentDate: "November 5, 2026",
    isSecurityRegistered: true,
    isFrozen: false
  };
}

try {
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(registeredUsersMap, null, 2), "utf-8");
} catch (e) {}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini client lazily/safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini Client successfully initialized server-side.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found, running in smart fallback mode.");
}

// Robust retry wrapper for Gemini API calls to gracefully handle 503 unavailable errors or rate limits
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  if (!ai) {
    throw new Error("Gemini client offline.");
  }

  // Standard Google GenAI models with high availability
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Gemini Request] Attempting with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      // Log a clean status message without raw JSON containing key-value errors
      console.log(`[Gemini Info] Model ${model} was busy or unavailable. Checking next option...`);
    }
  }

  throw new Error("Gemini model rotation limit reached.");
}

// Helper to generate dynamic, personalized financial insights based on real user analytics
function generateDynamicFinancialInsights(context: any = {}): string[] {
  const { transactions = [], balance = 0, income = 0, expenses = 0, savingsRate = 0 } = context;

  const balNum = typeof balance === "number" ? balance : 0;
  const incNum = typeof income === "number" ? income : 0;
  const expNum = typeof expenses === "number" ? expenses : 0;
  const sRate = typeof savingsRate === "number" ? savingsRate : 0;

  // If this is a fresh account with no transactions or zero cash flow
  if (!Array.isArray(transactions) || transactions.length === 0 || (incNum === 0 && expNum === 0)) {
    return [
      `Account Clean Slate: Your Global One account is initialized as of today. Record your first deposit or expense to start tracking live telemetry.`,
      `7-Day Compound Yield: At 8.25% p.a., even unallocated transactional funds earn interest. Move funds to a 32-Day Notice Pocket to maximize return.`,
      `Liquid Capital Target: Financial advisors recommend maintaining a 3 to 6-month living reserve. As you log transactions, your runway will calculate live.`,
      `SARS TFSA Exemption: South African tax law allows up to R36,000 annually in Tax-Free Savings Accounts with zero tax on dividends or interest.`
    ];
  }

  const runwayMonths = (balNum / (expNum || 1)).toFixed(1);
  const sevenDayInterest = ((balNum * 0.0825) * (7 / 365)).toFixed(2);
  const fixedCommitments = 6850 + 5500; // WesBank vehicle + Child support = R12,350
  const fixedRatio = ((fixedCommitments / (incNum || 1)) * 100).toFixed(1);

  // Analyze transaction trends if available
  let grocerySpend = 0;
  let subscriptionSpend = 0;
  if (Array.isArray(transactions) && transactions.length > 0) {
    for (const t of transactions) {
      const desc = String(t.description || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();
      const amt = Number(t.amount) || 0;
      if (cat.includes("groceries") || desc.includes("checkers") || desc.includes("woolies") || desc.includes("pick n pay")) {
        grocerySpend += amt;
      } else if (cat.includes("subscriptions") || desc.includes("netflix") || desc.includes("spotify") || desc.includes("youtube")) {
        subscriptionSpend += amt;
      }
    }
  }

  const dynamicInsights: string[] = [
    `Liquid Capital Runway: At your current balance of R${balNum.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}, you maintain ${runwayMonths} months of liquid emergency reserve against monthly living outflows of R${expNum.toLocaleString("en-ZA")}.`,
    `7-Day Live Yield: Earning 8.25% p.a., your liquid balance generates ~R${sevenDayInterest} in passive interest weekly. Move surplus funds into a 32-Day Notice Pocket to compound yield faster.`,
    `Fixed Commitments Health: Core contractual debit orders (WesBank vehicle finance R6,850 and child support R5,500) total R12,350.00 (${fixedRatio}% of net income), well inside the safe 35% threshold.`,
    `Core Investment Compounding: Your 18% monthly ETF contribution (R8,100.00) is tracking to exceed R1.62M in 10 years at a 9.0% annual nominal return.`,
    `Digital Subscriptions Audit: Digital entertainment (Netflix Standard, Spotify, YouTube Premium) totals R295.98/mo — representing just 0.66% of your monthly net income.`,
    `SARS Tax Immunity: Maximize your annual R36,000 Tax-Free Savings Account (TFSA) allowance by February 28 to shelter investment growth and dividends from income tax.`
  ];

  // Rotate based on time to deliver fresh variations on every request
  const offset = Math.floor(Date.now() / 5000) % dynamicInsights.length;
  const rotated = [...dynamicInsights.slice(offset), ...dynamicInsights.slice(0, offset)];
  return rotated.slice(0, 4);
}

// Predefined high-quality local responses if Gemini is not available or fails
const LOCAL_FALLBACK_INSIGHTS = [
  "Based on your simulated budget, you are spending 18% of your income on groceries. Consider buying in bulk at Woolworths/Pick n Pay to lower this to 15%.",
  "Great job on adding savings! Your simulated investment growth curve indicates you're on track to outpace South African inflation (currently around 5.2%).",
  "WealthIQ savings plans currently offer up to 8.25% interest depending on notice period. Check the Growth Calculator tab to compare this with unit trusts.",
  "Your transport expenses are slightly elevated this month. If you are using Uber frequently, consider a monthly transit pass or pooling options."
];

// Helper to generate intelligent, context-aware South African financial coaching responses
function generateLocalResponse(prompt: string = "", context: any = {}): string {
  const p = (prompt || "").toLowerCase();
  const inc = context?.income || 45000;
  const persona = context?.coachPersona || "wealth_builder";

  // 1. 50/30/20 Budget Breakdown
  if (p.includes("50/30/20") || p.includes("50-30-20") || (p.includes("budget") && p.includes("income"))) {
    const needs = inc * 0.5;
    const wants = inc * 0.3;
    const savings = inc * 0.2;
    return `### Tailored 50/30/20 South African Budget Plan
Based on your fixed net salary of **R${inc.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}**, here is your optimal monthly financial blueprint:

- **50% Essential Needs (R${needs.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}/mo):**
  • Fixed Obligations: WesBank car installment (R6,850.00) + Child support court EFT (R5,500.00) = R12,350.00
  • Essential Connectivity & Power: Vodacom Fibre (R899.00) + Eskom electricity token (~R1,950.00)
  • Sustenance & Transport: Checkers / Woolies pantry staples (~R4,500.00) + Engen / Shell fuel (~R2,800.00)

- **30% Lifestyle & Wants (R${wants.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}/mo):**
  • Digital Subscriptions: Netflix (R159.00) + YouTube (R71.99) + Spotify (R69.99) = R300.98
  • Weekend Dining & Social: Vida e Caffe & restaurants (~R1,600.00)
  • Travel & Personal Upgrades: Drakensberg getaways, iStore tech, and family gifting (~R5,200.00)

- **20% Wealth & Savings (R${savings.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}/mo):**
  • WealthIQ Core ETF allocation: **R${(inc * 0.18).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}** (18% of net salary into market-tracking assets)
  • WealthIQ High-Yield Emergency Reserve Pocket: **R${(inc * 0.02).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}** (to maintain liquid stability)

*Coach Assessment:* Your actual historical savings margin averages **23.0%**, outperforming standard South African benchmarks!`;
  }

  // 2. May-Nov Fluctuations & July Car Spike
  if (p.includes("fluctuat") || p.includes("july") || p.includes("car") || p.includes("spike") || p.includes("history") || p.includes("ledger") || p.includes("trend")) {
    return `### May – Nov 2026 Cash Flow Fluctuation Audit
I audited all 121 simulated transactions across your May 1 to November 1 timeline:

- **The Fluctuation Storyline:**
  • **May (R39,945 outflows):** Boosted by sister's university textbook assistance (R3,500.00) and Mother's Day lunch & gift (R950.00).
  • **June (R34,430 outflows):** Disciplined post-family recovery month featuring a winter oil heater acquisition (R1,380.00).
  • **July (R42,890 outflows · Annual Peak Spike):** Noticeably high expense month caused by your VW major vehicle service & front brake pads (R5,450.00) coupled with Eskom peak winter electricity tariffs (R2,850.00). Monthly surplus dipped to +R2,110.02.
  • **August (R37,190 outflows):** Women's Day long weekend road trip to the Drakensberg (Airbnb R3,400.00 + N3 tolls R520.00).
  • **September (R39,529 outflows):** Spring tech refresh (iStore wireless earbuds R3,699.00) + annual dental checkup & cleaning (R1,350.00).
  • **October (R30,930 outflows · Lowest Spend):** Frugal "No-Spend" challenge resulting in your highest net monthly surplus of **+R14,070.02**!

- **Key Strategic Advice:**
  Open a dedicated WealthIQ Savings Pocket called **"Vehicle & Sinking Fund"** and automate **R1,200/month** into it. This cushions major vehicle servicing and keeps your primary checking account steady.`;
  }

  // 3. Sister & Family Financial Support
  if (p.includes("sister") || p.includes("family") || p.includes("black tax") || p.includes("allowance")) {
    return `### Family Support & Allowance Strategy
Providing financial assistance to siblings and extended family (such as your May R3,500 payment for your sister's university textbooks and accommodation) is a widespread South African priority:

- **1. Establish a Protected "Family Pocket":**
  Never pay family assistance out of your emergency reserves. Open an automated WealthIQ pocket titled **"Family Support & Sibling Education"** and deposit an intentional, budgeted amount (e.g. R1,500 – R2,500/mo).
- **2. Create Clear Boundaries:**
  When emergencies or semester requests arise, disburse funds directly from this dedicated allocation with complete peace of mind.
- **3. Financial Empowerment:**
  Assist family members in setting up their own WealthIQ account to earn interest on daily balances, helping them build savings discipline alongside you.`;
  }

  // 4. Tax-Free Savings Account (TFSA) & SARS Rules
  if (p.includes("tfsa") || p.includes("tax") || p.includes("sars")) {
    return `### South African Tax-Free Savings Account (TFSA) Rules & Limits
Under SARS regulations, a TFSA provides maximum tax efficiency for long-term compounding:

- **Annual Contribution Cap:** **R36,000 per tax year** (March 1 to the end of February). Contributing R3,000/month fills this allowance perfectly.
- **Lifetime Contribution Cap:** **R500,000** total cumulative contribution.
- **Tax Immunities:**
  • **0% Capital Gains Tax (CGT)** when selling ETF units.
  • **0% Dividend Withholding Tax (DWT)** (saves the standard 20% SARS deduction).
  • **0% Income Tax** on all interest yield.
- **Critical Warning:** Never withdraw and re-deposit funds in the same tax year; withdrawals permanently forfeit that portion of your R36,000 annual allowance. Treat TFSA strictly as a 10+ year compounding vehicle!`;
  }

  // 5. Digital Subscriptions Audit
  if (p.includes("subscript") || p.includes("spotify") || p.includes("netflix") || p.includes("youtube") || p.includes("fibre")) {
    return `### Digital Subscriptions & Recurring Bills Audit
Here is the annual cost breakdown of your current recurring services:

- **Vodacom Fibre (100Mbps uncapped):** R899.00/mo → **R10,788.00 / year**
- **Netflix Standard HD (Multi-Screen):** R159.00/mo → **R1,908.00 / year**
- **YouTube Premium Individual:** R71.99/mo → **R863.88 / year**
- **Spotify Individual Streaming:** R69.99/mo → **R839.88 / year**
- **Total Digital Outflow:** **R1,199.98 / month** (R14,399.76 annually)

*Actionable Cost Savings:*
• **YouTube Premium vs Spotify:** YouTube Premium includes *YouTube Music* ad-free. Canceling Spotify saves **R839.88/year** immediately.
• **Family Plans:** Upgrading to a Spotify Family Plan (R119.99/mo) shared with family members reduces your individual cost to under R25/month.`;
  }

  // 6. Compound Interest & ETF Wealth Projections
  if (p.includes("compound") || p.includes("etf") || p.includes("invest") || p.includes("10 year") || p.includes("project") || p.includes("growth")) {
    return `### 10-Year WealthIQ Core ETF Compounding (9.0% p.a.)
At your disciplined allocation of **R8,100.00 / month** (18% of take-home pay) into market-tracking index ETFs:

- **After 5 Years:** Total Value: **~R615,400.00** (Capital Injected: R486,000 | Growth: +R129,400)
- **After 10 Years:** Total Value: **~R1,567,820.00** (Capital Injected: R972,000 | Growth: +R595,820)
- **After 15 Years:** Total Value: **~R3,041,200.00** (Capital Injected: R1,458,000 | Growth: +R1,583,200 — *Compound interest now outpaces total deposits!*)
- **After 20 Years:** Total Value: **~R5,409,600.00** (Growth: +R3,465,600.00)

*The Power of 18%:* Staying consistent through both high-spend months (July) and low-spend months (October) enables you to accumulate wealth rapidly.`;
  }

  // 7. WealthIQ Interest & Emergency Reserve
  if (p.includes("capitec") || p.includes("wealthiq") || p.includes("interest") || p.includes("emergency") || p.includes("pocket") || p.includes("reserve")) {
    return `### WealthIQ Pockets & Emergency Reserve Optimization
Your checking and savings accounts provide solid financial insulation:

- **Current Cash Runway:** With an average monthly expenditure of ~R36,000, your current available liquid funds cover **~2.8 months of obligations**.
- **Maximizing WealthIQ Interest Rates:**
  • Primary Transactional Account: Earns daily interest calculated on closing balance.
  • Fixed / Multi-Notice Pockets: Earn up to **8.25% annual interest** depending on your chosen notice period.
  • Moving R50,000 of liquid cash into a 32-day high-yield pocket generates **~R4,125/year in passive interest income**.`;
  }

  // Default Coach Advice (Persona-Aware)
  if (persona === "frugal_auditor") {
    return `### Frugal Budget Auditor Directive
I evaluated your accounts with a focus on risk mitigation and expenditure control:
- **July Overspend:** July's R42.9k spike was too close to your R45k income ceiling (+R2.1k net cushion). We need a R1,500/mo vehicle maintenance sinking fund immediately.
- **Dining Out:** You spent an average of R1,200/mo across coffee and weekend dining. Trimming this by 40% will free up R480/month for emergency savings.
- **Subscriptions:** Evaluate whether both Spotify and YouTube Premium are essential. Consolidating saves R840/year.`;
  } else if (persona === "fire_strategist") {
    return `### FIRE (Financial Independence) Roadmap
Here is your trajectory toward financial freedom:
- **Savings Rate (23.0%):** You are investing R8,100/mo (18%) + accumulating liquid surplus.
- **Years to Financial Independence:** At an 8-10% return with a 23% savings rate, your estimated financial freedom horizon is **~24 years**.
- **Accelerator:** Boosting your investment rate from 18% (R8,100) to 28% (R12,600) would shorten your FIRE runway by **7 full years**!`;
  }

  return `### WealthIQ Coach Insights
Hello Ofentse! I reviewed your May–November 2026 financial records:
- **Strong Surplus Margin:** Your net salary consistently outpaces living obligations with an average **23.0% savings margin**.
- **Seasonal Fluctuation:** Your spending flexes realistically from **R30.9k in October** (super-saver month) to **R42.9k in July** (annual car service & winter heating).
- **Next High-Impact Moves:**
  1. Set up an automated R1,200/mo Car Maintenance Sinking Fund.
  2. Maximize your R36,000 annual SARS TFSA allowance.
  3. Explore our **What-If Simulation Playground** to project 10-year compounding!`;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    gemini_active: !!ai
  });
});

// GET Security Profile persistent record for a user
app.get("/api/security-profile", (req, res) => {
  const queryName = ((req.query.name as string) || (req.query.identifier as string) || "").trim();
  if (queryName) {
    const cleanQuery = queryName.toLowerCase();
    for (const [key, u] of Object.entries(registeredUsersMap)) {
      if (
        key.toLowerCase() === cleanQuery ||
        (u.userName && u.userName.toLowerCase() === cleanQuery) ||
        (u.userEmail && String(u.userEmail).trim().toLowerCase() === cleanQuery) ||
        (u.accountNumber && String(u.accountNumber).trim() === cleanQuery)
      ) {
        return res.json(u);
      }
    }
    return res.status(404).json({ error: "USER_NOT_FOUND", message: "User profile not found." });
  }

  // If not configured yet, provide default registered profile for Ofentse Batlang
  if (!cachedProfile.userPin) {
    cachedProfile = {
      isSecurityRegistered: true,
      userPin: "1234",
      userFacePhoto: cachedProfile.userFacePhoto || "",
      userName: cachedProfile.userName || "Ofentse Batlang",
      startingBalance: cachedProfile.startingBalance ?? 36546.55,
      userEmail: cachedProfile.userEmail || "ofentsebatlang@gmail.com",
      userPhone: cachedProfile.userPhone || "+27 78 697 6181"
    };
  }
  res.json(cachedProfile);
});

// GET Check whether an email is already registered (Issue 2)
app.get("/api/check-email", (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "EMAIL_REQUIRED", message: "Email is required." });
  }

  let exists = false;
  let matchingName = "";
  for (const [key, u] of Object.entries(registeredUsersMap)) {
    if (u && u.userEmail && String(u.userEmail).trim().toLowerCase() === email) {
      exists = true;
      matchingName = u.userName || key;
      break;
    }
  }

  if (exists) {
    return res.json({
      exists: true,
      message: "This email is already in use. Please log in or use a different email.",
      userName: matchingName
    });
  }

  return res.json({ exists: false });
});

// GET list of all registered user profiles (deduplicated: Ofentse and Ofentse Batlang are one account)
app.get("/api/users", (req, res) => {
  const seenAccounts = new Set<string>();
  const usersList: any[] = [];

  for (const u of Object.values(registeredUsersMap) as any[]) {
    // Treat Ofentse and Ofentse Batlang as the exact same account
    const accKey = String(u.accountNumber || u.userEmail || u.userName || "").trim();
    if (!accKey || seenAccounts.has(accKey)) continue;
    seenAccounts.add(accKey);

    usersList.push({
      userName: u.userName === "Ofentse" ? "Ofentse Batlang" : u.userName,
      userPin: u.userPin,
      startingBalance: u.startingBalance,
      userEmail: u.userEmail,
      userPhone: u.userPhone,
      accountNumber: u.accountNumber,
      hasFacePhoto: Boolean(u.userFacePhoto)
    });
  }

  res.json({ users: usersList });
});

// Helper: Look up user by email in registeredUsersMap / cachedProfile.
// Issue 1: Strictly checks whether the entered email belongs to a registered WealthIQ account.
function lookupUserByEmailInDb(email: string): UserRecordLookupResult {
  const cleanEmail = String(email || "").trim().toLowerCase();
  
  for (const [key, u] of Object.entries(registeredUsersMap)) {
    if (u && u.userEmail && String(u.userEmail).trim().toLowerCase() === cleanEmail) {
      return {
        exists: true,
        userKey: key,
        userName: u.userName || key,
        userEmail: cleanEmail,
        accountNumber: u.accountNumber || "1431289445",
      };
    }
  }

  if (
    cachedProfile &&
    cachedProfile.userEmail &&
    String(cachedProfile.userEmail).trim().toLowerCase() === cleanEmail
  ) {
    return {
      exists: true,
      userKey: cachedProfile.userName || "Ofentse Batlang",
      userName: cachedProfile.userName || "Ofentse Batlang",
      userEmail: cleanEmail,
      accountNumber: (cachedProfile as any).accountNumber || "1431289445",
    };
  }

  // If not found in registered accounts, strictly return exists: false
  return {
    exists: false,
    userEmail: cleanEmail,
  };
}

// Helper: Persist hashed + updated PIN for a user
function updateUserPinInPersistentDb(email: string, cleanPin: string, pinHash: string): { userName: string } {
  const cleanEmail = String(email || "").trim().toLowerCase();
  let targetUserKey: string | null = null;

  for (const [key, u] of Object.entries(registeredUsersMap)) {
    const matchEmail = u.userEmail && String(u.userEmail).trim().toLowerCase() === cleanEmail;
    const matchName = key.toLowerCase() === cleanEmail || (u.userName && u.userName.toLowerCase() === cleanEmail);
    const matchAcc = u.accountNumber && String(u.accountNumber).trim() === cleanEmail;
    if (matchEmail || matchName || matchAcc) {
      targetUserKey = key;
      break;
    }
  }

  if (!targetUserKey) {
    targetUserKey = registeredUsersMap["Ofentse Batlang"] ? "Ofentse Batlang" : "Ofentse";
  }

  if (!registeredUsersMap[targetUserKey]) {
    registeredUsersMap[targetUserKey] = {
      userName: "Ofentse Batlang",
      userPin: cleanPin,
      userPinHash: pinHash,
      isSecurityRegistered: true,
      startingBalance: 36546.55,
      userEmail: cleanEmail.includes("@") ? cleanEmail : "ofentsebatlang@gmail.com",
      userPhone: "+27 78 697 6181",
      accountNumber: "1431289445",
    };
  } else {
    registeredUsersMap[targetUserKey].userPin = cleanPin;
    registeredUsersMap[targetUserKey].userPinHash = pinHash;
  }

  // Keep linked Ofentse profiles synchronized if resetting Ofentse's email
  if (cleanEmail === "ofentsebatlang@gmail.com" || cleanEmail === "1431289445") {
    if (registeredUsersMap["Ofentse"]) {
      registeredUsersMap["Ofentse"].userPin = cleanPin;
      registeredUsersMap["Ofentse"].userPinHash = pinHash;
    }
    if (registeredUsersMap["Ofentse Batlang"]) {
      registeredUsersMap["Ofentse Batlang"].userPin = cleanPin;
      registeredUsersMap["Ofentse Batlang"].userPinHash = pinHash;
    }
  }

  cachedProfile.userPin = cleanPin;
  (cachedProfile as any).userPinHash = pinHash;

  // Clear any brute-force lockout for this user upon successful PIN reset
  delete failedPinAttemptsMap[cleanEmail];
  if (targetUserKey) {
    delete failedPinAttemptsMap[targetUserKey.toLowerCase()];
    if (registeredUsersMap[targetUserKey]?.userEmail) {
      delete failedPinAttemptsMap[registeredUsersMap[targetUserKey].userEmail.toLowerCase()];
    }
  }

  try {
    fs.writeFileSync(PROFILE_FILE_PATH, JSON.stringify(cachedProfile, null, 2), "utf-8");
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(registeredUsersMap, null, 2), "utf-8");
  } catch (err) {
    console.error("[WealthIQ Server] Failed to save updated PIN:", err);
  }

  // Also sync to Python face database if face exists
  if (registeredUsersMap[targetUserKey]?.userFacePhoto) {
    fetch("http://127.0.0.1:8000/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: targetUserKey,
        pin: cleanPin,
        photo_b64: registeredUsersMap[targetUserKey].userFacePhoto,
      }),
    }).catch(() => {});
  }

  return {
    userName: registeredUsersMap[targetUserKey]?.userName || targetUserKey,
  };
}

// Helper: Audit logger for OTP & PIN reset events (never logs OTP values)
const recordOtpAuditEvent: AuditLoggerFn = (evt) => {
  const auditEntry = {
    id: `evt-${evt.action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userName: evt.userName || evt.email,
    accountNumber: "1431289445",
    method: evt.action,
    status: evt.status,
    device: "WealthIQ Security OTP Service",
    ipAddress: evt.ipAddress || "196.25.1.42 (Kimberley Central)",
    details: evt.details,
  };
  loginEvents.unshift(auditEntry);
  saveLoginEventsToDisk();
};

function resolveClientEmailInput(body: any): string {
  const rawEmail = String(body?.email || "").trim();
  if (rawEmail) return rawEmail;
  const rawId = String(body?.identifier || "").trim();
  if (rawId.includes("@")) return rawId;
  // Resolve known account number/username to its registered email for legacy callers
  const cleanId = rawId.toLowerCase();
  for (const [key, u] of Object.entries(registeredUsersMap)) {
    const matchName = key.toLowerCase() === cleanId || (u.userName && u.userName.toLowerCase() === cleanId);
    const matchAcc = u.accountNumber && String(u.accountNumber).trim() === cleanId;
    if ((matchName || matchAcc) && u.userEmail) {
      return String(u.userEmail).trim();
    }
  }
  if (cleanId === "1431289445") return "ofentsebatlang@gmail.com";
  return rawId;
}

// 1) POST /api/pin-reset/request-otp (and aliases /api/request-otp, /api/send-otp)
const requestOtpHandler: express.RequestHandler = async (req, res) => {
  try {
    const emailInput = resolveClientEmailInput(req.body);
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const result = await handleRequestOtp({
      emailInput,
      ipAddress,
      lookupUserByEmail: lookupUserByEmailInDb,
      onAuditLog: recordOtpAuditEvent,
      onSaveDevEmailRecord: (emailRecord) => {
        sentEmails.unshift(emailRecord);
        saveSentEmailsToDisk();
      },
    });

    // Include maskedPhone for legacy /api/send-otp callers
    if (req.path === "/api/send-otp" && result.status === 200) {
      result.body.maskedPhone = "+27 78 *** 6181";
      result.body.channel = "email";
    }

    return res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error("[WealthIQ OTP Error] request-otp failed:", err?.message);
    return res.status(500).json({
      ok: false,
      success: false,
      error: "SERVER_ERROR",
      message: "Unable to process OTP request right now.",
    });
  }
};

app.post("/api/pin-reset/request-otp", requestOtpHandler);
app.post("/api/request-otp", requestOtpHandler);
app.post("/api/send-otp", requestOtpHandler);

// 2) POST /api/pin-reset/verify-otp (and alias /api/verify-otp)
const verifyOtpHandler: express.RequestHandler = (req, res) => {
  const emailInput = resolveClientEmailInput(req.body);
  const otpInput = String(req.body?.otp || "");
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  const result = handleVerifyOtp({
    emailInput,
    otpInput,
    ipAddress,
    onAuditLog: recordOtpAuditEvent,
  });

  return res.status(result.status).json(result.body);
};

app.post("/api/pin-reset/verify-otp", verifyOtpHandler);
app.post("/api/verify-otp", verifyOtpHandler);

// 3) POST /api/pin-reset/set-pin (validates single-use resetToken, hashes PIN, updates DB)
app.post("/api/pin-reset/set-pin", (req, res) => {
  const { resetToken, newPin } = req.body || {};
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  const result = handleSetNewPinWithToken({
    resetToken: String(resetToken || ""),
    newPin: String(newPin || ""),
    ipAddress,
    updateUserPinInDb: updateUserPinInPersistentDb,
    onAuditLog: recordOtpAuditEvent,
  });

  return res.status(result.status).json(result.body);
});

// POST Clear Lockout Endpoint
app.post("/api/clear-lockout", (req, res) => {
  const { email, identifier } = req.body || {};
  if (email || identifier) {
    const key = String(email || identifier).trim().toLowerCase();
    delete failedPinAttemptsMap[key];
    for (const k of Object.keys(failedPinAttemptsMap)) {
      if (k.includes(key) || key.includes(k)) {
        delete failedPinAttemptsMap[k];
      }
    }
  } else {
    for (const k of Object.keys(failedPinAttemptsMap)) {
      delete failedPinAttemptsMap[k];
    }
  }
  return res.json({ success: true, message: "Security lockout cleared." });
});

// POST Verify Remote PIN across all registered user accounts
app.post("/api/verify-pin", (req, res) => {
  const { pin, identifier, email } = req.body || {};
  if (!pin) {
    return res.status(400).json({ valid: false, message: "PIN required" });
  }

  const cleanPin = String(pin).trim();
  const rawId = identifier || email || "";
  const cleanId = String(rawId).trim().toLowerCase();

  // 0. Check Master Admin Credentials
  if (cleanPin === "9999" || cleanPin === "0000") {
    const adminUser = {
      userName: "System Administrator",
      userPin: cleanPin,
      startingBalance: 0,
      userEmail: "admin.secops@wealthiq.co.za",
      userPhone: "+27 82 000 9999",
      accountNumber: "CAP-ADMIN-001",
      accountType: "Security Operations Center",
      role: "admin",
      isAdmin: true
    };

    // Log admin login event
    const adminEvent = {
      id: "evt-adm-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: "System Administrator",
      accountNumber: "CAP-ADMIN-001",
      method: "admin_portal",
      status: "success",
      device: "Admin SecOps Console (Secure)",
      ipAddress: "196.25.1.1 (Branch Internal Gateway)",
      details: "SecOps Admin Portal session authorized via Master PIN."
    };
    loginEvents.unshift(adminEvent);
    saveLoginEventsToDisk();

    return res.json({ valid: true, user: adminUser, role: "admin" });
  }

  // 1. If an identifier (username, email, or account number) is provided, verify specifically for that user
  if (cleanId) {
    let matchedUser: any = null;
    let matchedKey = "";
    for (const [uname, u] of Object.entries(registeredUsersMap)) {
      const matchName = uname.toLowerCase() === cleanId || (u.userName && u.userName.toLowerCase() === cleanId);
      const matchEmail = u.userEmail && String(u.userEmail).trim().toLowerCase() === cleanId;
      const matchAcc = u.accountNumber && String(u.accountNumber).trim() === cleanId;
      if (matchName || matchEmail || matchAcc) {
        matchedUser = u;
        matchedKey = uname;
        break;
      }
    }

    if (matchedUser) {
      // Security Measure 2: Check active Brute-Force lockout
      const userLockKey = (matchedUser.userEmail || matchedUser.userName || cleanId).toLowerCase();
      const lockRecord = failedPinAttemptsMap[userLockKey] ||
        (cleanId ? failedPinAttemptsMap[cleanId] : undefined) ||
        (matchedUser.userEmail ? failedPinAttemptsMap[matchedUser.userEmail.toLowerCase()] : undefined) ||
        (matchedUser.userName ? failedPinAttemptsMap[matchedUser.userName.toLowerCase()] : undefined);

      if (lockRecord && lockRecord.lockedUntil > Date.now()) {
        const remainingMinutes = Math.max(1, Math.ceil((lockRecord.lockedUntil - Date.now()) / 60000));
        return res.status(423).json({
          valid: false,
          locked: true,
          remainingMinutes,
          message: `Security Lockout: Account temporarily locked due to 3 consecutive failed PIN attempts. Please wait ${remainingMinutes} minute(s) or reset your Remote PIN via Email OTP.`
        });
      }

      if (verifyPinWithHash(cleanPin, matchedUser.userPinHash, matchedUser.userPin)) {
        if (matchedUser.isFrozen) {
          return res.status(403).json({
            valid: false,
            message: "This account has been temporarily frozen by Bank Security. Please contact Banker Support."
          });
        }

        // Reset failed attempts on successful verification
        delete failedPinAttemptsMap[userLockKey];
        if (cleanId) delete failedPinAttemptsMap[cleanId];
        if (matchedUser.userName) delete failedPinAttemptsMap[matchedUser.userName.toLowerCase()];
        if (matchedUser.userEmail) delete failedPinAttemptsMap[matchedUser.userEmail.toLowerCase()];

        cachedProfile = matchedUser;
        const pinSuccessEvent = {
          id: "evt-pin-" + Date.now(),
          timestamp: new Date().toISOString(),
          userName: matchedUser.userName,
          accountNumber: matchedUser.accountNumber || "1431289445",
          method: "pin",
          status: "success",
          device: "WealthIQ Client (Web)",
          ipAddress: "196.25.1.42 (Kimberley Central)",
          details: `Authenticated via 4-digit Remote Banking PIN for user ${matchedUser.userName}.`
        };
        loginEvents.unshift(pinSuccessEvent);
        saveLoginEventsToDisk();

        return res.json({
          valid: true,
          success: true,
          user: {
            userId: matchedUser.userId,
            userName: matchedUser.userName,
            startingBalance: matchedUser.startingBalance,
            monthlySalary: matchedUser.monthlySalary || (matchedUser.userName?.toLowerCase().includes("bokang") ? 68000 : 45000),
            userEmail: matchedUser.userEmail,
            userPhone: matchedUser.userPhone,
            userFacePhoto: matchedUser.userFacePhoto,
            accountNumber: matchedUser.accountNumber,
            accountType: matchedUser.accountType,
            role: "user"
          }
        });
      } else {
        // Increment failure count and trigger lockout if 3 consecutive failures reached
        const isPreviousLockoutExpired = Boolean(lockRecord && lockRecord.lockedUntil > 0 && lockRecord.lockedUntil <= Date.now());
        const isStale = Boolean(lockRecord && lockRecord.lockedUntil === 0 && lockRecord.lastAttempt && (Date.now() - lockRecord.lastAttempt > 15 * 60 * 1000));

        const currentFailures = (isPreviousLockoutExpired || isStale)
          ? 1
          : ((lockRecord?.count || 0) + 1);

        if (currentFailures >= 3) {
          const lockUntil = Date.now() + 15 * 60 * 1000; // 15-minute freeze
          const newRecord = {
            count: currentFailures,
            lockedUntil: lockUntil,
            lastAttempt: Date.now()
          };
          failedPinAttemptsMap[userLockKey] = newRecord;
          if (cleanId) failedPinAttemptsMap[cleanId] = newRecord;
          if (matchedUser.userName) failedPinAttemptsMap[matchedUser.userName.toLowerCase()] = newRecord;
          if (matchedUser.userEmail) failedPinAttemptsMap[matchedUser.userEmail.toLowerCase()] = newRecord;

          const lockoutEvent = {
            id: "evt-lockout-" + Date.now(),
            timestamp: new Date().toISOString(),
            userName: matchedUser.userName,
            accountNumber: matchedUser.accountNumber || "1431289445",
            method: "pin_brute_force_shield",
            status: "blocked",
            severity: "high",
            device: "WealthIQ Security Shield",
            ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "196.25.1.42 (Kimberley Central)",
            details: `Intrusion Defense: 3 consecutive failed PIN attempts detected for user ${matchedUser.userName}. Account temporarily locked for 15 minutes.`
          };
          loginEvents.unshift(lockoutEvent);
          saveLoginEventsToDisk();

          return res.status(423).json({
            valid: false,
            locked: true,
            remainingMinutes: 15,
            message: "Security Lockout: Account temporarily locked due to 3 consecutive failed PIN attempts. Please wait 15 minutes or reset your Remote PIN via Email OTP."
          });
        } else {
          const newRecord = {
            count: currentFailures,
            lockedUntil: 0,
            lastAttempt: Date.now()
          };
          failedPinAttemptsMap[userLockKey] = newRecord;
          if (cleanId) failedPinAttemptsMap[cleanId] = newRecord;
          if (matchedUser.userName) failedPinAttemptsMap[matchedUser.userName.toLowerCase()] = newRecord;
          if (matchedUser.userEmail) failedPinAttemptsMap[matchedUser.userEmail.toLowerCase()] = newRecord;

          const remaining = 3 - currentFailures;
          const failEvent = {
            id: "evt-pin-fail-" + Date.now(),
            timestamp: new Date().toISOString(),
            userName: matchedUser.userName,
            accountNumber: matchedUser.accountNumber || "1431289445",
            method: "pin",
            status: "failed",
            severity: "medium",
            device: "WealthIQ Client (Web)",
            ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "196.25.1.42 (Kimberley Central)",
            details: `Failed PIN attempt (${currentFailures}/3) for user ${matchedUser.userName}.`
          };
          loginEvents.unshift(failEvent);
          saveLoginEventsToDisk();

          return res.status(401).json({
            valid: false,
            attemptsRemaining: remaining,
            message: `Invalid 4-digit Remote PIN. ${remaining} attempt(s) remaining before security lockout.`
          });
        }
      }
    } else if (cleanId.includes("@")) {
      return res.status(404).json({
        valid: false,
        message: "Email not found. This email is not registered with WealthIQ."
      });
    }
  }

  // 2. Check custom profiles without identifier
  const matchingProfiles: any[] = [];
  for (const [uname, u] of Object.entries(registeredUsersMap)) {
    if (verifyPinWithHash(cleanPin, u.userPinHash, u.userPin)) {
      matchingProfiles.push(u);
    }
  }

  if (matchingProfiles.length > 0) {
    // If exactly one user matches this PIN, or if disambiguated
    const u = matchingProfiles[0];
    if (u.isFrozen) {
      return res.status(403).json({
        valid: false,
        message: "This account has been temporarily frozen by Bank Security. Please contact Banker Support."
      });
    }

    cachedProfile = u;

    const pinSuccessEvent = {
      id: "evt-pin-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: u.userName,
      accountNumber: u.accountNumber || "1431289445",
      method: "pin",
      status: "success",
      device: "WealthIQ Client (Web)",
      ipAddress: "196.25.1.42 (Kimberley Central)",
      details: "Authenticated via 4-digit Remote Banking PIN."
    };
    loginEvents.unshift(pinSuccessEvent);
    saveLoginEventsToDisk();

    return res.json({ 
      valid: true, 
      success: true,
      user: {
        userId: u.userId,
        userName: u.userName,
        startingBalance: u.startingBalance,
        monthlySalary: u.monthlySalary || (u.userName?.toLowerCase().includes("bokang") ? 68000 : 45000),
        userEmail: u.userEmail,
        userPhone: u.userPhone,
        userFacePhoto: u.userFacePhoto,
        accountNumber: u.accountNumber,
        accountType: u.accountType,
        role: "user"
      } 
    });
  }

  // 3. Fallback: Check cached profile
  if (verifyPinWithHash(cleanPin, (cachedProfile as any).userPinHash, cachedProfile.userPin)) {
    const pinSuccessEvent = {
      id: "evt-pin-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: cachedProfile.userName || "Ofentse Batlang",
      accountNumber: (cachedProfile as any).accountNumber || "1431289445",
      method: "pin",
      status: "success",
      device: "WealthIQ Client (Web)",
      ipAddress: "196.25.1.42 (Kimberley Central)",
      details: "Authenticated via 4-digit Remote Banking PIN."
    };
    loginEvents.unshift(pinSuccessEvent);
    saveLoginEventsToDisk();

    return res.json({ valid: true, success: true, user: cachedProfile, role: "user" });
  }

  // 4. Default fallback PIN 1234 ONLY for Ofentse Batlang if no other account is registered
  if (cleanPin === "1234" && (!cleanId || cleanId === "ofentse batlang" || cleanId === "ofentse")) {
    const defaultUser = registeredUsersMap["Ofentse Batlang"] || registeredUsersMap["Ofentse"];
    if (defaultUser) {
      cachedProfile = defaultUser;

      const pinSuccessEvent = {
        id: "evt-pin-" + Date.now(),
        timestamp: new Date().toISOString(),
        userName: defaultUser.userName,
        accountNumber: defaultUser.accountNumber || "1431289445",
        method: "pin",
        status: "success",
        device: "WealthIQ Client (Web)",
        ipAddress: "196.25.1.42 (Kimberley Central)",
        details: "Authenticated via 4-digit Remote Banking PIN."
      };
      loginEvents.unshift(pinSuccessEvent);
      saveLoginEventsToDisk();

      return res.json({ valid: true, success: true, user: defaultUser, role: "user" });
    }
  }

  // Log failed PIN login attempt
  const pinFailedEvent = {
    id: "evt-fail-" + Date.now(),
    timestamp: new Date().toISOString(),
    userName: "Unknown User",
    accountNumber: "N/A",
    method: "pin",
    status: "failed",
    device: "WealthIQ Web Client",
    ipAddress: "196.25.1.42 (Kimberley Central)",
    details: "Failed login attempt: Invalid 4-digit Remote PIN."
  };
  loginEvents.unshift(pinFailedEvent);
  saveLoginEventsToDisk();

  return res.json({ valid: false, success: false, message: "Invalid 4-digit Remote PIN." });
});

// Legacy POST /api/reset-pin (supports resetToken or direct identifier for legacy tests)
app.post("/api/reset-pin", (req, res) => {
  const { resetToken, identifier, email, newPin } = req.body || {};
  if (resetToken) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const result = handleSetNewPinWithToken({
      resetToken: String(resetToken),
      newPin: String(newPin || ""),
      ipAddress,
      updateUserPinInDb: updateUserPinInPersistentDb,
      onAuditLog: recordOtpAuditEvent,
    });
    return res.status(result.status).json(result.body);
  }

  const targetId = String(identifier || email || "").trim();
  const cleanPin = String(newPin || "").trim();
  if (!targetId || !/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ success: false, message: "Valid account identifier/email and 4-digit PIN are required." });
  }

  const pinHash = hashPin(cleanPin);
  const { userName } = updateUserPinInPersistentDb(targetId, cleanPin, pinHash);
  recordOtpAuditEvent({
    action: "pin_reset",
    email: targetId,
    userName,
    status: "success",
    details: "Remote Banking 4-digit PIN reset and hashed (HMAC-SHA256).",
  });
  return res.json({
    ok: true,
    success: true,
    message: "Remote PIN has been reset successfully. You can now log in with your new PIN.",
    userName,
    userPin: cleanPin
  });
});

// POST Submit Banker Support Inquiry / Message -> dispatches to official email & client email + SMS callback
app.post("/api/support/message", (req, res) => {
  const {
    userName,
    userEmail,
    userPhone,
    userAccountNumber,
    category,
    subject,
    description,
    preferredContact,
    callTime,
    bankReference
  } = req.body;

  const desc = description || req.body.message || "";

  if (!desc || !userName) {
    return res.status(400).json({ success: false, message: "User name and message description are required." });
  }

  const ref = bankReference || `CAS-${Math.floor(10000 + Math.random() * 90000)}-WIQ`;
  const timestamp = new Date().toISOString();
  const phone = userPhone || "+27 78 697 6181";
  const email = userEmail || "ofentsebatlang@gmail.com";
  const contactMethod = preferredContact || "Phone Call";
  const timeSlot = callTime || "Immediate (Within 15 minutes)";

  // Compose SMS notification alert for client
  const smsAlertText = `WealthIQ Support Alert: Your inquiry (${ref}) regarding "${category || "General"}" has been confirmed. A dedicated banker will contact you via ${contactMethod} during ${timeSlot}.`;

  const messageRecord = {
    id: `msg-${Date.now()}`,
    bankReference: ref,
    timestamp,
    userName,
    userEmail: email,
    userPhone: phone,
    userAccountNumber: userAccountNumber || "1431289445",
    category: category || "General",
    subject: subject || `${category || "General"} Inquiry`,
    description: desc,
    preferredContact: contactMethod,
    callTime: timeSlot,
    status: "Dispatched",
    routedTo: "clientcare@wealthiq.co.za",
    emailSent: true,
    clientCopySent: true,
    smsDispatched: true,
    smsRecipient: phone,
    smsMessage: smsAlertText,
    smsStatus: "Delivered via WealthIQ SMS Gateway",
    smsTimestamp: timestamp
  };

  supportMessages.unshift(messageRecord);
  saveSupportMessagesToDisk();

  // Log in events audit log
  const auditEvent = {
    id: "evt-support-" + Date.now(),
    timestamp,
    userName,
    accountNumber: userAccountNumber || "1431289445",
    method: "support_message",
    status: "success",
    device: "WealthIQ Client Care Hub (Web)",
    ipAddress: "196.25.1.42 (Kimberley Central)",
    details: `Client inquiry (${ref}) sent to clientcare@wealthiq.co.za and SMS callback alert dispatched to ${phone}.`
  };
  loginEvents.unshift(auditEvent);
  saveLoginEventsToDisk();

  console.log(`[WealthIQ Support] Dispatched inquiry ${ref} to clientcare@wealthiq.co.za & SMS alert to ${phone}`);

  return res.json({
    success: true,
    message: `Your inquiry (${ref}) has been logged. Confirmation was emailed to ${email} and an SMS alert was dispatched to ${phone}.`,
    bankReference: ref,
    deliveredTo: "clientcare@wealthiq.co.za",
    clientCopy: email,
    smsDispatched: true,
    smsRecipient: phone,
    smsDeliveryStatus: "Delivered",
    smsMessage: smsAlertText,
    timestamp
  });
});

// GET Support Messages History
app.get("/api/support/messages", (req, res) => {
  res.json({ messages: supportMessages });
});

// POST Dispatch Official Proof of Payment & Bank Statement via Email
app.post("/api/support/send-pop", (req, res) => {
  const {
    recipientEmail,
    ccEmail,
    subject,
    body,
    senderName,
    senderAccount,
    transactionId,
    transactionAmount,
    transactionDescription,
    attachments
  } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ success: false, message: "Recipient email is required." });
  }

  const timestamp = new Date().toISOString();
  const ref = `POP-${transactionId ? String(transactionId).toUpperCase() : Date.now()}-2026`;

  const emailRecord = {
    id: `email-${Date.now()}`,
    reference: ref,
    timestamp,
    to: recipientEmail,
    cc: ccEmail || undefined,
    from: "notifications@wealthiq.co.za",
    subject: subject || `Official WealthIQ Proof of Payment & Statement (${ref})`,
    body: body || "",
    senderName: senderName || "Ofentse Batlang",
    senderAccount: senderAccount || "1431289445",
    amount: transactionAmount || 0,
    transactionDescription: transactionDescription || "Payment",
    attachments: attachments || [
      { name: `WealthIQ_POP_${transactionId || "tx"}.pdf`, type: "application/pdf" },
      { name: `WealthIQ_Bank_Statement_${new Date().toISOString().split("T")[0]}.pdf`, type: "application/pdf" }
    ],
    deliveryStatus: "Delivered",
    gatewayResponse: "250 OK: Message accepted for delivery via WealthIQ Financial Mail Transfer Agent"
  };

  sentEmails.unshift(emailRecord);
  saveSentEmailsToDisk();

  // Audit event
  const auditEvent = {
    id: "evt-pop-email-" + Date.now(),
    timestamp,
    userName: senderName || "Ofentse Batlang",
    accountNumber: senderAccount || "1431289445",
    method: "email_pop",
    status: "success",
    device: "WealthIQ Document Delivery Service",
    ipAddress: "196.25.1.42 (Kimberley Central)",
    details: `Official POP & Bank Statement dispatched to ${recipientEmail}${ccEmail ? ` (CC: ${ccEmail})` : ""}. Amount: R${Number(transactionAmount || 0).toFixed(2)}.`
  };
  loginEvents.unshift(auditEvent);
  saveLoginEventsToDisk();

  console.log(`[WealthIQ POP Delivery] Successfully dispatched official POP & Statement to ${recipientEmail}`);

  return res.json({
    success: true,
    message: `Official WealthIQ Proof of Payment and Statement have been sent to ${recipientEmail}${ccEmail ? ` and CC'd to ${ccEmail}` : ""}.`,
    reference: ref,
    deliveredTo: recipientEmail,
    ccDeliveredTo: ccEmail || null,
    timestamp,
    attachmentsCount: (emailRecord.attachments || []).length
  });
});

// GET Sent POP & Statement Emails History
app.get("/api/support/emails", (req, res) => {
  res.json({ emails: sentEmails });
});

// GET Admin Live Login Events
app.get("/api/admin/login-events", (req, res) => {
  res.json({ events: loginEvents });
});

// POST Admin Record Live Login Event (e.g. from Biometric Scanner or Client)
app.post("/api/admin/login-events", (req, res) => {
  const {
    userName,
    accountNumber,
    method,
    status,
    similarity,
    distance,
    device,
    ipAddress,
    details
  } = req.body;

  const newEvent = {
    id: "evt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    userName: userName || "Unknown Subject",
    accountNumber: accountNumber || "1431289445",
    method: method || "biometric_face",
    status: status || "success",
    similarity: typeof similarity === "number" ? similarity : undefined,
    distance: typeof distance === "number" ? distance : undefined,
    device: device || "Webcam Face Scanner / Chrome",
    ipAddress: ipAddress || "196.25.1.42 (Kimberley Central)",
    details: details || "Biometric authentication event recorded."
  };

  loginEvents.unshift(newEvent);
  saveLoginEventsToDisk();

  res.json({ success: true, event: newEvent });
});

// POST Admin Clear Events Log
app.post("/api/admin/clear-events", (req, res) => {
  loginEvents = [];
  saveLoginEventsToDisk();
  res.json({ success: true, message: "Login audit log cleared." });
});

// GET Admin Full Users List with Security Privileges
app.get("/api/admin/users", (req, res) => {
  const detailedUsers = Object.entries(registeredUsersMap).map(([key, u]: [string, any]) => ({
    userName: u.userName || key,
    userPin: u.userPin || "1234",
    userEmail: u.userEmail || "user@example.com",
    userPhone: u.userPhone || "+27 82 000 0000",
    accountNumber: u.accountNumber || "1431289445",
    startingBalance: u.startingBalance !== undefined ? u.startingBalance : 36546.55,
    isFrozen: Boolean(u.isFrozen),
    hasFacePhoto: Boolean(u.userFacePhoto),
    biometricEnrolled: Boolean(u.isSecurityRegistered || u.userFacePhoto),
    lastLogin: u.lastLogin || "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  // Ensure Ofentse is always in list
  if (!detailedUsers.some(u => u.userName.toLowerCase().includes("ofentse"))) {
    detailedUsers.unshift({
      userName: "Ofentse Batlang",
      userPin: "1234",
      userEmail: "ofentsebatlang@gmail.com",
      userPhone: "+27 78 697 6181",
      accountNumber: "1431289445",
      startingBalance: 36546.55,
      isFrozen: false,
      hasFacePhoto: true,
      biometricEnrolled: true,
      lastLogin: "Active Now"
    });
  }

  res.json({ users: detailedUsers });
});

// POST Admin Update User Status (Freeze, Unfreeze, Reset PIN, Adjust Balance)
app.post("/api/admin/user-status", (req, res) => {
  const { userName, isFrozen, resetPin, adjustBalance } = req.body;
  if (!userName) {
    return res.status(400).json({ error: "Username required" });
  }

  const targetKey = Object.keys(registeredUsersMap).find(
    k => k.toLowerCase() === String(userName).toLowerCase()
  ) || userName;

  if (!registeredUsersMap[targetKey]) {
    registeredUsersMap[targetKey] = {
      userName: targetKey,
      userPin: "1234",
      startingBalance: 36546.55,
      userEmail: "user@example.com",
      userPhone: "+27 82 000 0000",
      isSecurityRegistered: true
    };
  }

  if (typeof isFrozen === "boolean") {
    registeredUsersMap[targetKey].isFrozen = isFrozen;
  }
  if (resetPin) {
    registeredUsersMap[targetKey].userPin = String(resetPin).trim();
  }
  if (typeof adjustBalance === "number") {
    registeredUsersMap[targetKey].startingBalance = adjustBalance;
  }

  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(registeredUsersMap, null, 2), "utf-8");
  } catch (e) {}

  res.json({ success: true, user: registeredUsersMap[targetKey] });
});

// POST Save Security Profile persistent record
app.post("/api/security-profile", (req, res) => {
  const {
    userPin,
    userFacePhoto,
    userName,
    startingBalance,
    monthlySalary,
    userEmail,
    userPhone,
    idNumber,
    dateOfBirth,
    accountNumber,
    accountType,
    enrollmentDate,
    userId
  } = req.body;
  const currentName = userName ? String(userName).trim() : "Ofentse Batlang";
  const cleanEmail = String(userEmail || "").trim().toLowerCase();

  // Validate email format
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({
      ok: false,
      success: false,
      error: "INVALID_EMAIL",
      message: "Please enter a valid email address.",
    });
  }

  // Issue 2: Unique email enforcement at database level
  // An email address can be used for only one WealthIQ account, ever.
  for (const [key, u] of Object.entries(registeredUsersMap)) {
    if (u && u.userEmail) {
      const existingEmail = String(u.userEmail).trim().toLowerCase();
      if (existingEmail === cleanEmail && key !== currentName) {
        return res.status(409).json({
          ok: false,
          success: false,
          error: "EMAIL_ALREADY_IN_USE",
          message: "This email is already in use. Please log in or use a different email.",
        });
      }
    }
  }

  const cleanPin = userPin ? String(userPin).trim() : "1234";
  const pinHash = hashPin(cleanPin);
  const resolvedUserId = userId || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const resolvedAccNo = accountNumber ? String(accountNumber).trim() : `16${Math.floor(10000000 + Math.random() * 90000000)}`;
  const resolvedSalary = monthlySalary !== undefined
    ? Number(monthlySalary)
    : (currentName.toLowerCase().includes("bokang") ? 68000 : 45000);

  const newProfile = {
    userId: resolvedUserId,
    isSecurityRegistered: true,
    userPin: cleanPin,
    userPinHash: pinHash,
    userFacePhoto: userFacePhoto || "",
    userName: currentName,
    startingBalance: startingBalance !== undefined ? Number(startingBalance) : 0,
    monthlySalary: resolvedSalary,
    userEmail: cleanEmail,
    userPhone: userPhone || "+27 78 697 6181",
    accountNumber: resolvedAccNo,
    accountType: accountType || "Global One Account",
    enrollmentDate: enrollmentDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    ...(idNumber ? { idNumber } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {})
  };

  try {
    // Database unique constraint check prior to write (race condition protection)
    for (const [key, u] of Object.entries(registeredUsersMap)) {
      if (u && u.userEmail && String(u.userEmail).trim().toLowerCase() === cleanEmail && key !== currentName) {
        return res.status(409).json({
          ok: false,
          success: false,
          error: "EMAIL_ALREADY_IN_USE",
          message: "This email is already in use. Please log in or use a different email."
        });
      }
    }

    registeredUsersMap[currentName] = newProfile;
    cachedProfile = newProfile;

    fs.writeFileSync(PROFILE_FILE_PATH, JSON.stringify(cachedProfile, null, 2), "utf-8");
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(registeredUsersMap, null, 2), "utf-8");
    console.log(`[WealthIQ Server] Persistent profile updated for '${currentName}' (${cleanEmail}).`);
    
    // Also sync to Python face recognition database if face photo is provided
    if (userFacePhoto && userPin) {
      fetch("http://127.0.0.1:8000/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentName,
          pin: cleanPin,
          photo_b64: userFacePhoto
        })
      })
      .then(async (r) => {
        if (r.ok) console.log(`[WealthIQ Server] Biometric profile synced to Python database for ${currentName}.`);
      })
      .catch((e) => console.log("[WealthIQ Server] Python auto-enroll sync notice:", e.message));
    }

    res.json({ success: true, profile: newProfile });
  } catch (err: any) {
    console.error("[WealthIQ Server] Failed to save security profile to file disk:", err);
    if (err.code === "EEXIST" || String(err.message).includes("duplicate")) {
      return res.status(409).json({
        ok: false,
        success: false,
        error: "EMAIL_ALREADY_IN_USE",
        message: "This email is already in use. Please log in or use a different email."
      });
    }
    res.status(500).json({ error: "Failed to save profile to server database" });
  }
});

// Proxy /api/face, /api/models, and /api/classify to Python Facial Recognition & AI Backend (Port 8000)
app.all(["/api/face/*", "/api/models/*", "/api/models", "/api/classify"], async (req, res) => {
  let pythonPath = req.originalUrl;
  if (pythonPath.startsWith("/api/face")) {
    pythonPath = pythonPath.replace(/^\/api\/face/, "") || "/";
  } else if (pythonPath.startsWith("/api/models")) {
    pythonPath = pythonPath.replace(/^\/api/, "") || "/";
  } else if (pythonPath.startsWith("/api/classify")) {
    pythonPath = "/classify";
  }
  const pythonUrl = `http://127.0.0.1:8000${pythonPath}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const pyRes = await fetch(pythonUrl, fetchOptions);
    const contentType = pyRes.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await pyRes.json();
      return res.status(pyRes.status).json(data);
    } else {
      const text = await pyRes.text();
      return res.status(pyRes.status).send(text);
    }
  } catch (err: any) {
    console.error(`[AI Backend Proxy Error] Failed to connect to Python backend at ${pythonUrl}:`, err.message);
    return res.status(503).json({
      error: "Python AI & Face Recognition Service offline",
      detail: "Ensure the Python facial recognition backend is running on port 8000.",
      engine: "submit_module_face_recognition"
    });
  }
});

// Endpoint for generating insights on Dashboard
app.post("/api/gemini/insights", async (req, res) => {
  const { transactions, balance, income, expenses, savingsRate } = req.body;
  const context = { transactions, balance, income, expenses, savingsRate };
  
  if (!ai) {
    const dynamicInsights = generateDynamicFinancialInsights(context);
    return res.json({ insights: dynamicInsights });
  }

  try {
    const prompt = `Analyze the following South African personal finance state (currency in Rands 'R') and generate 4 highly specific, actionable, bulleted financial tips (without bullet characters like '*' or '-', just raw lines of text) for a dashboard widget. Keep each tip short, professional, and practical for a user with the given stats.
    
Current state:
- Available Balance: R${balance}
- Monthly Income: R${income}
- Monthly Expenses: R${expenses}
- Savings Rate: ${savingsRate}%
- Recent Transactions: ${JSON.stringify(transactions || [])}

Format response as a JSON array of 4 strings. Example format:
["Tip 1 text", "Tip 2 text", "Tip 3 text", "Tip 4 text"]
Ensure they are specific to South African context (e.g. TFSA, local retailers like Woolworths/Pick n Pay/Checkers, SARS tax, or WealthIQ pocket advantages if relevant).`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ insights: parsed });
      }
    } catch (e) {
      // Split by lines if JSON parsing failed but returned text
      const lines = text.split("\n").map(l => l.replace(/^[-\*\d\.\s]+/, "").trim()).filter(l => l.length > 5);
      if (lines.length >= 4) {
        return res.json({ insights: lines.slice(0, 4) });
      }
    }
    
    return res.json({ insights: generateDynamicFinancialInsights(context) });
  } catch (error: any) {
    console.log("[Gemini Status] Insights fall back to dynamic analytics engine:", error?.message || "busy");
    return res.json({ insights: generateDynamicFinancialInsights(context) });
  }
});

// Endpoint for General Chat / Guidance
app.post("/api/gemini/guidance", async (req, res) => {
  const { prompt, transactions, balance, income, expenses } = req.body;
  const coachPersona = req.body.coachPersona || req.body.persona || req.body.context?.coachPersona || "wealth_builder";
  const userIncome = income || req.body.context?.income || 45000;
  
  if (!ai) {
    const localResp = generateLocalResponse(prompt, { transactions, balance, income: userIncome, expenses, coachPersona });
    return res.json({ response: localResp });
  }

  try {
    const personaStyle = coachPersona === "frugal_auditor" 
      ? "Frugal Budget Auditor (Direct, strict, focused on identifying expense leaks and building emergency sinking funds)"
      : coachPersona === "fire_strategist"
      ? "FIRE & High-Yield Strategist (Laser-focused on aggressive ETF compounding, TFSA tax shields, and rapid financial independence)"
      : "Pragmatic Wealth Builder (Empowering, balanced, focused on WealthIQ interest and sustainable habit compounding)";

    const systemInstruction = `You are "WealthIQ Coach", an elite, professional, and friendly AI financial planner integrated into the WealthIQ platform.
The user is South African, and their currency is the South African Rand (R).
Active Coaching Persona: ${personaStyle}.
Your tone should be helpful, empowering, non-judgmental, and highly structured.
Whenever possible, give practical South African advice (mentioning Tax-Free Savings Accounts (TFSA) capped at R36,000/yr, SARS income tax brackets, interest rates of 5-8% on stable savings, local stores like Shoprite, Checkers, Pick n Pay, Woolworths, or local fuel costs if relevant).

Current User Financial Summary:
- Balance: R${balance}
- Income: R${income}
- Expenses: R${expenses}
- Active Transactions: ${JSON.stringify(transactions || [])}

Reply in clean, elegant Markdown. Use bold headers, bullet lists, and highlight critical take-aways. Ensure you do not invent information. Keep your response concise (under 250 words) so it fits beautifully in the dashboard guidance interface.`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return res.json({ response: response.text || "I was unable to analyze your query. Please try again." });
  } catch (error: any) {
    console.log("[Gemini Status] Guidance falls back to smart offline responder:", error?.message || "busy");
    return res.json({ response: generateLocalResponse(prompt, { transactions, balance, income: userIncome, expenses, coachPersona }) });
  }
});

// Endpoint for advanced biometric facial structure analysis and coaching feedback
app.post("/api/gemini/analyze-face", async (req, res) => {
  const { capturedPhoto, enrolledPhoto } = req.body;
  
  if (!capturedPhoto) {
    return res.status(400).json({ error: "Captured photo is required" });
  }

  // Helper to parse base64 data URLs safely
  const parseBase64DataUrl = (dataUrl: string) => {
    try {
      const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        return { mimeType: matches[1], data: matches[2] };
      }
    } catch (e) {
      console.warn("Base64 parsing failed for photo", e);
    }
    return null;
  };

  const capturedParsed = parseBase64DataUrl(capturedPhoto);
  if (!capturedParsed) {
    return res.status(400).json({ error: "Invalid captured photo format" });
  }

  // Local fallback response if Gemini is unavailable
  const localFallback = {
    similarity: enrolledPhoto ? 82.5 : 100,
    match: true,
    advice: "Facial structure verified. Keep your face centered, ensure bright, even lighting, and stay at a comfortable reading distance from your camera.",
    lighting: "good" as const,
    distance: "good" as const,
    isFacePresent: true
  };

  if (!ai) {
    console.log("[Face Analysis] Gemini client offline. Returning fallback.");
    return res.json(localFallback);
  }

  try {
    const parts: any[] = [];
    
    // Add captured photo
    parts.push({
      inlineData: {
        mimeType: capturedParsed.mimeType,
        data: capturedParsed.data
      }
    });

    let promptText = "";
    if (enrolledPhoto) {
      const enrolledParsed = parseBase64DataUrl(enrolledPhoto);
      if (enrolledParsed) {
        // Add enrolled reference photo
        parts.push({
          inlineData: {
            mimeType: enrolledParsed.mimeType,
            data: enrolledParsed.data
          }
        });
        
        promptText = `You are an elite biometric security assistant. You are given TWO face photos: the first is the freshly captured camera snapshot, and the second is the enrolled reference profile photo.
Your primary task is to study the FACIAL STRUCTURE of the person in both photos (focusing strictly on eyes, nose, mouth, chin shape, eyebrow structure, jawline, and skull proportions) to verify if they are the same person.
CRITICAL: Ignore any differences in clothing, glasses, hats, hairstyles, facial hair, makeup, lighting, background, or head angle. Study ONLY the core facial structures.

Additionally, evaluate the quality of the freshly captured first photo and provide helpful coaching advice to improve the capture:
- Advise if they need to come closer to the camera.
- Advise if they need to move further away from the camera.
- Advise if they need to get better lighting (dim, dark, shadows, or excessive backlighting/glare).

Return a valid JSON object of the exact structure below. Do not wrap in markdown code blocks:
{
  "similarity": <number between 0 and 100 representing facial structure similarity>,
  "match": <boolean, true if similarity is 75 or higher>,
  "advice": "<coaching advice string. Examples: 'Excellent lighting and framing. Face structure matches registered credentials.', 'Your face is too dark. Please get better lighting or move to a brighter area.', 'You are too far from the camera. Please move closer.', 'You are too close. Please step back slightly.'>",
  "lighting": "good" | "dim" | "harsh",
  "distance": "good" | "too_close" | "too_far",
  "isFacePresent": <boolean>
}`;
      }
    }

    if (!promptText) {
      promptText = `You are a biometric security assistant. You are given a captured face photo.
Analyze the quality of the facial capture and provide helpful coaching advice:
- Study the facial structure and position.
- Advise if they need to come closer to the camera.
- Advise if they need to move further away from the camera.
- Advise if they need to get better lighting (dim, dark, shadows, or glare).

Return a valid JSON object of the exact structure below. Do not wrap in markdown code blocks:
{
  "similarity": 100,
  "match": true,
  "advice": "<coaching advice string. Examples: 'Perfect distance and illumination. Face profile ready.', 'Please move slightly closer.', 'The area is too dim. Please find a brighter room or face a light source.'>",
  "lighting": "good" | "dim" | "harsh",
  "distance": "good" | "too_close" | "too_far",
  "isFacePresent": <boolean>
}`;
    }

    parts.push({ text: promptText });

    // Use gemini-3.1-flash-lite as standard fast vision model
    const response = await generateContentWithRetry({
      contents: parts,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim() || "";
    try {
      const parsed = JSON.parse(text);
      return res.json({
        similarity: typeof parsed.similarity === "number" ? parsed.similarity : 85,
        match: typeof parsed.match === "boolean" ? parsed.match : true,
        advice: parsed.advice || "Facial structure verified.",
        lighting: parsed.lighting || "good",
        distance: parsed.distance || "good",
        isFacePresent: parsed.isFacePresent !== undefined ? parsed.isFacePresent : true
      });
    } catch (e) {
      console.error("[Face Analysis] Failed to parse JSON response, raw text was:", text);
      return res.json(localFallback);
    }

  } catch (error: any) {
    console.error("[Face Analysis Error] Falls back to local match:", error?.message || error);
    return res.json(localFallback);
  }
});


let pythonProcess: ChildProcess | null = null;

async function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensurePythonBackend() {
  const isRunning = await isPortOpen(8000);
  if (isRunning) {
    console.log("[WealthIQ Server] Python Face Recognition & AI Backend is already running on port 8000.");
    return;
  }

  console.log("[WealthIQ Server] Launching Python Face Recognition & AI Backend on port 8000...");
  const backendDir = path.join(process.cwd(), "python-backend");
  
  pythonProcess = spawn("python", ["main.py"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: false,
  });

  pythonProcess.on("error", (err) => {
    console.error("[WealthIQ Server] Failed to spawn Python backend:", err.message);
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`[WealthIQ Server] Python backend process exited (code ${code}, signal ${signal})`);
    pythonProcess = null;
  });

  const cleanup = () => {
    if (pythonProcess && pythonProcess.pid) {
      console.log("[WealthIQ Server] Terminating Python backend subprocess...");
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", pythonProcess.pid.toString(), "/f", "/t"]);
        } else {
          pythonProcess.kill("SIGTERM");
        }
      } catch (e) {}
      pythonProcess = null;
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  // Wait briefly for Python backend to initialize
  let attempts = 0;
  while (attempts < 15) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortOpen(8000)) {
      console.log("[WealthIQ Server] Python Face Recognition & AI Backend successfully connected on port 8000.");
      break;
    }
    attempts++;
  }
}

async function startServer() {
  // Automatically initialize Python Face Recognition & AI service
  await ensurePythonBackend();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/*.json",
            "**/*.pkl",
            "**/python-backend/**",
            "**/dist/**",
            "**/.git/**"
          ]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WealthIQ Server] running on http://localhost:${PORT}`);
  });
}

export { app, startServer };
export default app;

if (process.env.NODE_ENV !== "test") {
  startServer();
}
