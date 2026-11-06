import assert from "assert";
import http from "http";
import { Socket } from "net";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

interface TestResult {
  name: string;
  passed: boolean;
  error?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err });
    console.error(`  ${RED}✗${RESET} ${name}`);
    console.error(`    ${RED}${err?.message || err}${RESET}`);
  }
}

function invokeApp(
  expressApp: any,
  method: string,
  urlPath: string,
  body?: any,
  ipAddress = "127.0.0.1"
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", {
      value: ipAddress,
      configurable: true,
    });

    const req = new http.IncomingMessage(socket) as any;
    req.method = method.toUpperCase();
    req.url = urlPath;
    req.headers = {
      "content-type": "application/json",
      host: "localhost:3000",
      "x-forwarded-for": ipAddress,
    };
    req.body = body || {};

    const res = new http.ServerResponse(req) as any;
    let responseData = "";
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      }
      return origWrite(chunk, ...args);
    }) as any;

    res.end = ((chunk: any, ...args: any[]) => {
      if (chunk && typeof chunk !== "function") {
        responseData += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      }
      let parsed: any = responseData;
      try {
        parsed = JSON.parse(responseData);
      } catch {}
      resolve({
        status: res.statusCode || 200,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
      });
      return origEnd(chunk, ...args);
    }) as any;

    expressApp.handle(req, res, (err: any) => {
      if (err) {
        resolve({
          status: 500,
          headers: {},
          body: { error: err.message },
        });
      }
    });
  });
}

async function main() {
  console.log(`\n${BOLD}=== WEALTHIQ AUTHENTICATION & DATA ISOLATION TEST SUITE ===${RESET}\n`);

  process.env.NODE_ENV = "test";
  const serverMod = await import("./server");
  const app = serverMod.app;

  // 1. Issue 1: Reset Password with a registered email succeeds
  await test("1. Reset password with registered email returns 200 and success", async () => {
    const res = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: "ofentsebatlang@gmail.com",
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, "Expected ok === true");
  });

  // 2. Issue 1: Reset Password with an unregistered email returns 404 and exact error message
  await test("2. Reset password with unregistered email returns 404 'Email not found. This email is not registered with WealthIQ.'", async () => {
    const res = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: "completely.unregistered.user@gmail.com",
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.ok === false, "Expected ok === false");
    assert(res.body.error === "EMAIL_NOT_FOUND", `Expected EMAIL_NOT_FOUND, got ${res.body.error}`);
    assert(
      res.body.message === "Email not found. This email is not registered with WealthIQ.",
      `Unexpected message: ${res.body.message}`
    );
  });

  // 3. Issue 1: Email normalization (whitespace & mixed casing)
  await test("3. Reset password normalizes email (handles whitespace & mixed casing)", async () => {
    const res = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: "   OfEntSeBatLang@GMAIL.com   ",
    });
    // Should match registered ofentsebatlang@gmail.com
    assert(res.status === 200 || res.status === 429, `Expected 200 or 429 cooldown, got ${res.status}`);
  });

  // 4. Issue 2: Register with a brand new email succeeds
  await test("4. Registration with a brand new email succeeds and creates isolated user", async () => {
    const uniqueEmail = `lerato.test.${Date.now()}@wealthiq-client.co.za`;
    const res = await invokeApp(app, "POST", "/api/security-profile", {
      userName: "Lerato Moloi",
      userEmail: uniqueEmail,
      userPhone: "+27 83 555 1234",
      userPin: "4321",
      startingBalance: 12500,
      accountNumber: "1688776655",
      idNumber: "960101 5000 08 2",
      dateOfBirth: "January 1, 1996",
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, "Expected success === true");
    assert(res.body.profile.userName === "Lerato Moloi", "Expected Lerato Moloi");
    assert(res.body.profile.userEmail === uniqueEmail.toLowerCase(), "Expected normalized email");
    assert(res.body.profile.accountNumber === "1688776655", "Expected unique account number");
    assert(res.body.profile.startingBalance === 12500, "Expected custom opening balance");
    // Clean up temporary test user
    const usersMap = (serverMod as any).registeredUsersMap || {};
    delete usersMap["Lerato Moloi"];
    try {
      const fsMod = await import("fs");
      const pathMod = await import("path");
      const dbPath = pathMod.resolve(process.cwd(), "users_database.json");
      if (fsMod.existsSync(dbPath)) {
        const cur = JSON.parse(fsMod.readFileSync(dbPath, "utf-8"));
        delete cur["Lerato Moloi"];
        fsMod.writeFileSync(dbPath, JSON.stringify(cur, null, 2), "utf-8");
      }
    } catch {}
  });

  // 5. Issue 2: Register with an existing email returns 409 'This email is already in use.'
  await test("5. Register with an existing email returns 409 'This email is already in use. Please log in or use a different email.'", async () => {
    const res = await invokeApp(app, "POST", "/api/security-profile", {
      userName: "Imposter User",
      userEmail: "ofentsebatlang@gmail.com",
      userPhone: "+27 71 000 0000",
      userPin: "1111",
    });
    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(res.body.error === "EMAIL_ALREADY_IN_USE", `Expected EMAIL_ALREADY_IN_USE, got ${res.body.error}`);
    assert(
      res.body.message === "This email is already in use. Please log in or use a different email.",
      `Unexpected message: ${res.body.message}`
    );
  });

  // 6. Issue 2: Register with existing email in uppercase casing also returns 409
  await test("6. Register with existing email in different letter casing returns 409 duplicate error", async () => {
    const res = await invokeApp(app, "POST", "/api/security-profile", {
      userName: "Another Imposter",
      userEmail: "   OFENTSEBATLANG@GMAIL.COM   ",
      userPhone: "+27 71 111 2222",
      userPin: "2222",
    });
    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(
      res.body.message === "This email is already in use. Please log in or use a different email.",
      `Unexpected message: ${res.body.message}`
    );
  });

  // 7. Issue 3: Login as Ofentse Batlang returns Ofentse's profile and data
  await test("7. Login as Ofentse Batlang returns Ofentse's data, balance (36,546.55), and salary (45,000)", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "1234",
      identifier: "ofentsebatlang@gmail.com",
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.valid === true, "Expected valid === true");
    assert(res.body.user.userName === "Ofentse Batlang", "Expected Ofentse Batlang");
    assert(res.body.user.accountNumber === "1431289445", "Expected 1431289445");
    assert(res.body.user.startingBalance === 36546.55, "Expected 36546.55");
    assert(res.body.user.monthlySalary === 45000, `Expected salary 45000, got ${res.body.user.monthlySalary}`);
  });

  // 8. Issue 3: Login as Bokang Khakhau returns Bokang's data, not Ofentse's
  await test("8. Login as Bokang Khakhau returns Bokang's isolated data, balance (80,000), and salary (68,000)", async () => {
    const res = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "2025",
      identifier: "khakhaumoepeng@gmail.com",
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.valid === true, "Expected valid === true");
    assert(res.body.user.userName === "Bokang Khakhau", "Expected Bokang Khakhau");
    assert(res.body.user.accountNumber === "1602309986", "Expected 1602309986, NOT Ofentse's account number");
    assert(res.body.user.startingBalance === 80000, "Expected 80000, NOT Ofentse's 36546.55");
    assert(res.body.user.monthlySalary === 68000, `Expected salary 68000, got ${res.body.user.monthlySalary}`);
    assert(res.body.user.userEmail === "khakhaumoepeng@gmail.com", "Email must be Bokang's email");
  });

  // 9. Check Email API endpoint
  await test("9. GET /api/check-email correctly identifies registered vs unregistered emails", async () => {
    const checkRegistered = await invokeApp(app, "GET", "/api/check-email?email=ofentsebatlang@gmail.com");
    assert(checkRegistered.body.exists === true, "Expected exists === true for registered email");

    const checkAvailable = await invokeApp(app, "GET", "/api/check-email?email=brand.new.user@wealthiq.co.za");
    assert(checkAvailable.body.exists === false, "Expected exists === false for new email");
  });

  // 10. Distinct Salary Validation
  await test("10. Verify distinct monthly salaries and complete account isolation between Ofentse and Bokang", async () => {
    const ofentseRes = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "1234",
      identifier: "ofentsebatlang@gmail.com",
    });
    const bokangRes = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "2025",
      identifier: "khakhaumoepeng@gmail.com",
    });

    assert(ofentseRes.body.user.monthlySalary === 45000, "Ofentse salary must be R45,000.00");
    assert(bokangRes.body.user.monthlySalary === 68000, "Bokang salary must be R68,000.00");
    assert(ofentseRes.body.user.monthlySalary !== bokangRes.body.user.monthlySalary, "Salaries must be different");
    assert(ofentseRes.body.user.startingBalance !== bokangRes.body.user.startingBalance, "Balances must be different");
    assert(ofentseRes.body.user.accountNumber !== bokangRes.body.user.accountNumber, "Account numbers must be different");
  });

  // 11. Security Measure 2: Consecutive Failed PIN Lockout progression (1/3 -> 2/3 -> 3/3 Lockout)
  await test("11. Failed PIN attempts accurately decrement (2 left -> 1 left -> 15-min lockout)", async () => {
    const testEmail = "ofentsebatlang@gmail.com";

    // Attempt 1: Wrong PIN
    const fail1 = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "9876",
      email: testEmail,
      identifier: testEmail,
    });
    assert(fail1.status === 401, `Attempt 1: expected 401, got ${fail1.status}`);
    assert(fail1.body.attemptsRemaining === 2, `Attempt 1: expected 2 attempts left, got ${fail1.body.attemptsRemaining}`);
    assert(fail1.body.message.includes("2 attempt(s) remaining"), `Expected '2 attempt(s) remaining', got ${fail1.body.message}`);

    // Attempt 2: Wrong PIN
    const fail2 = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "9875",
      email: testEmail,
      identifier: testEmail,
    });
    assert(fail2.status === 401, `Attempt 2: expected 401, got ${fail2.status}`);
    assert(fail2.body.attemptsRemaining === 1, `Attempt 2: expected 1 attempt left, got ${fail2.body.attemptsRemaining}`);
    assert(fail2.body.message.includes("1 attempt(s) remaining"), `Expected '1 attempt(s) remaining', got ${fail2.body.message}`);

    // Attempt 3: 3rd Consecutive Wrong PIN -> Triggers Lockout
    const fail3 = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "9874",
      email: testEmail,
      identifier: testEmail,
    });
    assert(fail3.status === 423, `Attempt 3: expected 423 locked status, got ${fail3.status}`);
    assert(fail3.body.locked === true, "Attempt 3: expected locked === true");
    assert(fail3.body.remainingMinutes === 15, "Attempt 3: expected 15 remainingMinutes");
    assert(fail3.body.message.includes("Security Lockout"), `Expected Security Lockout message, got ${fail3.body.message}`);

    // Attempt 4: Subsequent attempt while locked remains locked
    const fail4 = await invokeApp(app, "POST", "/api/verify-pin", {
      pin: "1234", // Even correct PIN is blocked while locked
      email: testEmail,
      identifier: testEmail,
    });
    assert(fail4.status === 423, `Attempt 4: expected 423 locked, got ${fail4.status}`);
    assert(fail4.body.locked === true, "Attempt 4: expected locked === true");
  });

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n${BOLD}Auth & Data Isolation Summary: ${passedCount}/${results.length} passed${RESET}\n`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in test-auth-isolation:", err);
  process.exit(1);
});
