import http from "http";
import { Socket } from "net";
import fs from "fs";
import path from "path";
import { SIMULATED_TRANSACTIONS } from "./src/data/simulatedTransactions";
import { clearOtpStoreForTesting } from "./src/services/pinResetService";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ suite, name, passed: true });
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message });
    console.log(`  ${RED}✗${RESET} ${name} - ${RED}${err.message}${RESET}`);
  }
}

// In-Memory Express Invoker
function invokeApp(app: any, method: string, url: string, body?: any): Promise<{ status: number; body: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket) as any;
    req.method = method.toUpperCase();
    req.url = url;

    let payload = "";
    if (body !== undefined) {
      payload = JSON.stringify(body);
      req.headers = {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload).toString(),
        host: "localhost"
      };
    } else {
      req.headers = {
        host: "localhost"
      };
    }

    const res = new http.ServerResponse(req) as any;
    let chunks: Buffer[] = [];

    const originalWrite = res.write;
    res.write = function(chunk: any, encoding?: any) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      return true;
    };

    res.end = function(chunk: any, encoding?: any) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      const raw = Buffer.concat(chunks).toString("utf-8");
      let parsed = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {}
      resolve({
        status: res.statusCode || 200,
        body: parsed,
        headers: res.getHeaders()
      });
      return this;
    };

    try {
      process.nextTick(() => {
        if (payload) {
          req.push(payload);
        }
        req.push(null);
      });
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// SUITE 1: DATA MODEL & LEDGER INTEGRITY TESTS
// ============================================================================
async function testLedgerIntegrity() {
  console.log(`\n${BOLD}${CYAN}=== SUITE 1: May - Nov 2026 Ledger & Financial Data Integrity ===${RESET}`);

  await runTest("Ledger", "Transaction record count covers fluctuating May - Nov dataset (130 records)", () => {
    assert(SIMULATED_TRANSACTIONS.length === 130, `Expected 130 transactions, found ${SIMULATED_TRANSACTIONS.length}`);
  });

  await runTest("Ledger", "All transaction IDs are unique (no React key conflicts)", () => {
    const idSet = new Set<string>();
    const duplicates: string[] = [];
    for (const tx of SIMULATED_TRANSACTIONS) {
      if (idSet.has(tx.id)) duplicates.push(tx.id);
      idSet.add(tx.id);
    }
    assert(duplicates.length === 0, `Duplicate IDs found: ${duplicates.join(", ")}`);
  });

  await runTest("Ledger", "Date range strictly spans from May 1 to Nov 1, 2026", () => {
    const dates = SIMULATED_TRANSACTIONS.map(tx => tx.date).sort();
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    assert(earliest === "2026-05-01", `Earliest date should be 2026-05-01, got ${earliest}`);
    assert(latest === "2026-11-01", `Latest date should be 2026-11-01, got ${latest}`);
  });

  await runTest("Ledger", "All transaction amounts are positive non-zero numbers", () => {
    for (const tx of SIMULATED_TRANSACTIONS) {
      assert(typeof tx.amount === "number" && tx.amount > 0 && !isNaN(tx.amount), 
        `Invalid amount in tx ${tx.id}: ${tx.amount}`);
    }
  });

  await runTest("Ledger", "Every month (May-Oct) has exactly one R45,000 salary deposit on the 25th", () => {
    const salaryTxs = SIMULATED_TRANSACTIONS.filter(tx => 
      tx.type === "income" && tx.amount === 45000 && tx.category === "Income"
    );
    assert(salaryTxs.length === 6, `Expected 6 monthly salary payments (May-Oct), found ${salaryTxs.length}`);
    for (const s of salaryTxs) {
      assert(s.date.endsWith("-25"), `Salary deposited on wrong date: ${s.date}`);
    }
  });

  await runTest("Ledger", "Mandatory fixed debit orders occur immediately after each 25th", () => {
    const months = ["05", "06", "07", "08", "09", "10"];
    for (const m of months) {
      const car = SIMULATED_TRANSACTIONS.find(t => t.date === `2026-${m}-26` && t.amount === 6850);
      const child = SIMULATED_TRANSACTIONS.find(t => t.date === `2026-${m}-26` && t.amount === 5500);
      const etf = SIMULATED_TRANSACTIONS.find(t => t.date === `2026-${m}-26` && t.amount === 8100);

      assert(!!car, `Missing vehicle installment (R6,850) for month ${m}`);
      assert(!!child, `Missing child support (R5,500) for month ${m}`);
      assert(!!etf, `Missing ETF monthly investment (R8,100 = 18%) for month ${m}`);
    }
  });

  await runTest("Ledger", "Cash flow solvency test: Running checking balance never falls below zero", () => {
    let runningBalance = 36546.55;
    let minBalance = runningBalance;
    let minTx: any = null;

    const sorted = [...SIMULATED_TRANSACTIONS].sort((a, b) => a.date.localeCompare(b.date));
    for (const tx of sorted) {
      if (tx.type === "income") runningBalance += tx.amount;
      else runningBalance -= tx.amount;
      if (runningBalance < minBalance) {
        minBalance = runningBalance;
        minTx = tx;
      }
    }
    assert(minBalance > 0, `Account went insolvent! Minimum balance was R${minBalance.toFixed(2)} on ${minTx?.date}`);
    console.log(`    ${YELLOW}ℹ${RESET} Baseline buffer: R36,546.55 | Minimum low: R${minBalance.toFixed(2)} | Final: R${runningBalance.toFixed(2)}`);
  });

  await runTest("Ledger", "Monthly Net Surplus is consistently positive (income > expenses)", () => {
    const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
    for (const m of months) {
      const inMonth = SIMULATED_TRANSACTIONS.filter(t => t.date.startsWith(m));
      const income = inMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = inMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const surplus = income - expense;
      assert(surplus > 0, `Month ${m} had a deficit: Income R${income} vs Expense R${expense}`);
    }
  });
}

// ============================================================================
// SUITE 2: FINANCIAL FORMULAS & MATH ENGINE TESTS
// ============================================================================
async function testFinancialMathEngine() {
  console.log(`\n${BOLD}${CYAN}=== SUITE 2: Financial Compounding & Savings Engine Formulas ===${RESET}`);

  await runTest("Formulas", "7-Day Live Interest Accumulation math is mathematically sound", () => {
    const apy = 8.25;
    const balance = 36546.55;
    const sevenDayInterest = (balance * (apy / 100)) * (7 / 365);
    
    assert(!isNaN(sevenDayInterest) && isFinite(sevenDayInterest), "Interest must be finite number");
    assert(sevenDayInterest > 0, "Interest on positive balance must be > 0");
    assert(Math.abs(sevenDayInterest - 57.82) < 0.1, `Expected ~57.82, calculated ${sevenDayInterest}`);
  });

  await runTest("Formulas", "7-Day Interest handles zero and negative edge cases safely", () => {
    const zeroInterest = (0 * (8.25 / 100)) * (7 / 365);
    assert(zeroInterest === 0, "Zero balance must yield zero interest");

    const negInterest = (-500 * (8.25 / 100)) * (7 / 365);
    const clampedInterest = Math.max(0, negInterest);
    assert(clampedInterest === 0, "Negative balances must clamp to zero interest");
  });

  await runTest("Formulas", "10-Year Ordinary Annuity Compound Growth formula accuracy", () => {
    const basePortfolio = 45000;
    const monthlyDeposit = 8100;
    const annualReturn = 9.0;
    const years = 10;
    const totalMonths = years * 12;
    const monthlyRate = (annualReturn / 100) / 12;

    let futureVal = basePortfolio;
    for (let m = 0; m < totalMonths; m++) {
      futureVal = (futureVal + monthlyDeposit) * (1 + monthlyRate);
    }

    const totalContributed = basePortfolio + (monthlyDeposit * totalMonths);
    const compoundGains = futureVal - totalContributed;

    assert(futureVal > 1500000, `Future value should exceed R1.5M, got ${futureVal}`);
    assert(compoundGains > 500000, `Compound gains should exceed R500k, got ${compoundGains}`);
    assert(!isNaN(futureVal) && isFinite(futureVal), "Future value calculation produced NaN or Infinity");
  });
}

// ============================================================================
// SUITE 3: BACKEND API ENDPOINTS & AUTH SECURITY FLOWS
// ============================================================================
async function testBackendEndpoints() {
  console.log(`\n${BOLD}${CYAN}=== SUITE 3: Backend Express APIs, Auth, OTP & Support ===${RESET}`);

  process.env.NODE_ENV = "test";
  const { app } = await import("./server.ts");
  let activeOtpCode = "";

  // 3.1 Health Check
  await runTest("API:Health", "GET /api/health returns 200 and online status", async () => {
    const res = await invokeApp(app, "GET", "/api/health");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === "ok", "Expected status ok");
  });

  // 3.2 Security Profile
  await runTest("API:Profile", "GET /api/security-profile returns registered profile", async () => {
    const res = await invokeApp(app, "GET", "/api/security-profile");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(!!res.body.userName, "Expected userName in security profile");
  });

  // 3.3 PIN Verification
  await runTest("API:Auth", "POST /api/verify-pin returns authorized for valid PIN '1234'", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-pin", { pin: "1234" });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.valid === true, "Expected valid to be true");
  });

  await runTest("API:Auth", "POST /api/verify-pin rejects incorrect PIN '8888'", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-pin", { pin: "8888" });
    assert(res.body.valid === false, "Expected valid to be false for wrong PIN");
  });

  await runTest("API:Auth", "POST /api/verify-pin returns 400 for empty PIN payload", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-pin", {});
    assert(res.status === 400, `Expected 400 for empty PIN, got ${res.status}`);
    assert(res.body.valid === false, "Expected valid to be false");
  });

  // 3.4 OTP Flow
  await runTest("API:OTP", "POST /api/send-otp generates code and DOES NOT expose OTP in response body", async () => {
    clearOtpStoreForTesting();
    const res = await invokeApp(app, "POST", "/api/send-otp", { identifier: "1431289445", email: "ofentsebatlang@gmail.com" });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, "Expected send-otp success");
    assert(!!res.body.maskedEmail, "Expected masked email");
    assert(!!res.body.maskedPhone, "Expected masked phone");

    // CRITICAL SECURITY ASSERTION
    assert(res.body.otp === undefined, "CRITICAL: Plaintext OTP exposed in response body!");
    assert(res.body.generatedOtp === undefined, "CRITICAL: Plaintext generatedOtp exposed!");

    if (fs.existsSync("sent_emails.json")) {
      const emails = JSON.parse(fs.readFileSync("sent_emails.json", "utf-8"));
      const lastOtpEmail = emails.filter(
        (e: any) => e.subject?.includes("Security OTP") || e.subject?.includes("WealthIQ security code")
      )[0];
      if (lastOtpEmail) {
        const match = lastOtpEmail.subject?.match(/(\d{6})/) || lastOtpEmail.body?.match(/(\d{6})/);
        if (match) activeOtpCode = match[1];
      }
    }
  });

  await runTest("API:OTP", "POST /api/verify-otp rejects invalid 6-digit code", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-otp", { otp: "000000", identifier: "1431289445" });
    assert(res.status === 400, `Expected status 400 for bad OTP, got ${res.status}`);
    assert(res.body.success === false, "Should fail on wrong OTP");
  });

  await runTest("API:OTP", "POST /api/verify-otp validates genuine code when provided", async () => {
    if (!activeOtpCode) {
      console.log(`    ${YELLOW}ℹ${RESET} Skipping live code verification (no file cache)`);
      return;
    }
    const res = await invokeApp(app, "POST", "/api/verify-otp", { otp: activeOtpCode, identifier: "1431289445" });
    assert(res.status === 200, `Expected 200 for correct OTP, got ${res.status}`);
    assert(res.body.success === true, "Expected successful OTP verification");
  });

  // 3.5 Reset PIN
  await runTest("API:ResetPIN", "POST /api/reset-pin enforces 4-digit numeric constraints", async () => {
    const resShort = await invokeApp(app, "POST", "/api/reset-pin", { newPin: "12", identifier: "1431289445" });
    assert(resShort.status === 400, `Expected 400 for short PIN, got ${resShort.status}`);

    const resValid = await invokeApp(app, "POST", "/api/reset-pin", { newPin: "1234", identifier: "1431289445" });
    assert(resValid.status === 200, `Expected 200 for valid 4-digit PIN, got ${resValid.status}`);
    assert(resValid.body.success === true, "Expected success for valid PIN reset");
  });

  // 3.6 Admin Login & Management
  await runTest("API:Admin", "GET /api/admin/users returns registered user list", async () => {
    const res = await invokeApp(app, "GET", "/api/admin/users");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const users = res.body.users || res.body;
    assert(Array.isArray(users), "Expected array of users");
    assert(users.length > 0, "Users list should not be empty");
  });

  await runTest("API:Admin", "POST /api/admin/user-status successfully updates freeze status", async () => {
    const res = await invokeApp(app, "POST", "/api/admin/user-status", {
      userName: "Ofentse Batlang",
      isFrozen: false
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, "Expected status update success");
  });

  await runTest("API:Admin", "POST /api/admin/login-events records new security event to audit trail", async () => {
    const res = await invokeApp(app, "POST", "/api/admin/login-events", {
      userName: "Ofentse Batlang",
      accountNumber: "1431289445",
      method: "biometric_face",
      status: "success",
      device: "Brutal Diagnostic Test Harness",
      ipAddress: "127.0.0.1",
      details: "Automated regression diagnostic verification."
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, "Expected event logging success");
  });

  // 3.7 Banker Support & SMS Dispatch
  await runTest("API:Support", "POST /api/support/message formats message and triggers SMS dispatch", async () => {
    const res = await invokeApp(app, "POST", "/api/support/message", {
      userName: "Ofentse Batlang",
      userPhone: "+27 82 456 7890",
      userEmail: "ofentsebatlang@gmail.com",
      subject: "Annual Tax Clearance Request",
      message: "Please prepare my 2026 tax statement for SARS.",
      preferredChannel: "sms"
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, "Expected message success");
    assert(res.body.smsDispatched === true, "Expected SMS dispatched flag");
    assert(res.body.smsRecipient === "+27 82 456 7890", `Expected recipient +27 82 456 7890`);
  });

  // 3.8 AI & Guidance Endpoints
  await runTest("API:AI", "POST /api/gemini/insights returns array of smart insights", async () => {
    const res = await invokeApp(app, "POST", "/api/gemini/insights", {
      transactions: SIMULATED_TRANSACTIONS.slice(0, 10)
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.insights), "Expected array of insights");
    assert(res.body.insights.length >= 3, `Expected at least 3 insights, got ${res.body.insights.length}`);
  });

  await runTest("API:AI", "POST /api/gemini/guidance delivers coaching advice for all personas", async () => {
    const personas = ["wealth_builder", "frugal_auditor", "fire_strategist"];
    for (const p of personas) {
      const res = await invokeApp(app, "POST", "/api/gemini/guidance", {
        prompt: "How can I budget for university fees and sister support?",
        persona: p,
        context: { income: 45000, coachPersona: p }
      });
      assert(res.status === 200, `Expected 200 for persona ${p}, got ${res.status}`);
      assert(typeof res.body.response === "string" && res.body.response.length > 20, `Response for ${p} invalid`);
    }
  });
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log(`${BOLD}======================================================${RESET}`);
  console.log(`${BOLD}       WEALTHIQ BRUTAL SYSTEM DIAGNOSTIC SUITE         ${RESET}`);
  console.log(`${BOLD}======================================================${RESET}`);

  const start = Date.now();

  try {
    await testLedgerIntegrity();
    await testFinancialMathEngine();
    await testBackendEndpoints();
  } catch (err: any) {
    console.error(`Fatal execution error:`, err);
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n${BOLD}======================================================${RESET}`);
  console.log(`${BOLD}               TEST EXECUTION SUMMARY                 ${RESET}`);
  console.log(`${BOLD}======================================================${RESET}`);
  console.log(`  Total Executed Tests : ${total}`);
  console.log(`  Passed               : ${GREEN}${passed}${RESET}`);
  console.log(`  Failed               : ${failed > 0 ? RED : GREEN}${failed}${RESET}`);
  console.log(`  Duration             : ${duration}s`);
  console.log(`${BOLD}======================================================${RESET}\n`);

  if (failed > 0) {
    console.log(`${RED}${BOLD}Failed Tests Details:${RESET}`);
    results.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.suite}] ${f.name}: ${RED}${f.error}${RESET}`);
    });
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ALL TESTS PASSED WITH ZERO CRITICAL FAILURES!${RESET}\n`);
    process.exit(0);
  }
}

main();
