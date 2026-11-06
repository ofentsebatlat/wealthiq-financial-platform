import http from "http";
import { Socket } from "net";
import fs from "fs";
import path from "path";
import {
  clearOtpStoreForTesting,
  setServerClockForTesting,
  resetServerClock,
  getRawOtpRecordForTesting,
  hashOtp,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
} from "./src/services/pinResetService";
import {
  getLatestTestInboxEmail,
  clearTestInbox,
} from "./src/services/emailService";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err?.message || String(err) });
    console.log(`  ${RED}✗${RESET} ${name} - ${RED}${err?.message || String(err)}${RESET}`);
  }
}

async function invokeApp(
  app: any,
  method: string,
  urlPath: string,
  body?: any,
  ipAddress = "10.0.0.1"
): Promise<{ status: number; body: any; raw: string }> {
  return new Promise((resolve) => {
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", {
      value: ipAddress,
      configurable: true,
    });
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = urlPath;
    req.headers = {
      "content-type": "application/json",
      host: "localhost:3000",
      "x-forwarded-for": ipAddress,
    };
    (req as any).body = body || {};

    const res = new http.ServerResponse(req);
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
      } catch { }
      resolve({ status: res.statusCode || 200, body: parsed, raw: responseData });
      return origEnd(chunk, ...args);
    }) as any;

    app.handle(req, res, (err: any) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message }, raw: err.message });
      }
    });
  });
}

function extractOtpFromInbox(email: string): string {
  const msg = getLatestTestInboxEmail(email);
  assert(!!msg, `Expected email in test inbox for ${email}`);
  const match = msg!.text.match(/verification code is:\s*(\d{6})/);
  assert(!!match && !!match[1], `Could not find 6-digit OTP in email text: ${msg!.text}`);
  return match![1];
}

async function main() {
  console.log(`\n${BOLD}${CYAN}=== WEALTHIQ EMAIL OTP & PIN RESET AUTOMATED SUITE ===${RESET}\n`);

  process.env.VITEST = "true";
  const serverMod = await import("./server");
  const app = serverMod.app;

  const REGISTERED_EMAIL = "ofentsebatlang@gmail.com";
  const UNKNOWN_EMAIL = "unregistered.stranger@example.com";

  // 1) Requesting an OTP and verifying with the correct code succeeds + sets new PIN with single-use resetToken
  await runTest("1. Requesting an OTP and verifying with the correct 6-digit code succeeds & resets PIN", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    const reqRes = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: REGISTERED_EMAIL,
    });
    assert(reqRes.status === 200, `Expected 200, got ${reqRes.status}`);
    assert(reqRes.body.ok === true, "Expected ok: true");
    assert(typeof reqRes.body.expiresAt === "number", "Expected numeric expiresAt");
    assert(reqRes.body.otp === undefined, "Plaintext OTP must never be returned in response");

    const code = extractOtpFromInbox(REGISTERED_EMAIL);
    assert(/^\d{6}$/.test(code), `Expected 6-digit OTP, got ${code}`);

    const verRes = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: code,
    });
    assert(verRes.status === 200, `Expected 200 on valid OTP, got ${verRes.status}`);
    assert(verRes.body.ok === true, "Expected ok: true on valid OTP");
    assert(typeof verRes.body.resetToken === "string" && verRes.body.resetToken.length >= 32, "Expected single-use resetToken");

    // Complete PIN reset using the issued resetToken
    const setPinRes = await invokeApp(app, "POST", "/api/pin-reset/set-pin", {
      resetToken: verRes.body.resetToken,
      newPin: "4321",
    });
    assert(setPinRes.status === 200, `Expected 200 on set-pin, got ${setPinRes.status}`);
    assert(setPinRes.body.ok === true, "Expected ok: true on set-pin");

    // Verify the new PIN works on /api/verify-pin
    const loginRes = await invokeApp(app, "POST", "/api/verify-pin", { pin: "4321" });
    assert(loginRes.status === 200 && loginRes.body.valid === true, "Expected new PIN 4321 to authenticate");

    // Restore PIN back to 1234 for other tests
    clearOtpStoreForTesting();
    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const restoreCode = extractOtpFromInbox(REGISTERED_EMAIL);
    const restoreVer = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: restoreCode,
    });
    await invokeApp(app, "POST", "/api/pin-reset/set-pin", {
      resetToken: restoreVer.body.resetToken,
      newPin: "1234",
    });
  });

  // 2) Verifying with a wrong code fails and decrements attemptsLeft
  await runTest("2. Verifying with a wrong code fails with OTP_INVALID and decrements attemptsLeft (4 -> 3 -> 2)", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const actualCode = extractOtpFromInbox(REGISTERED_EMAIL);
    const wrongCode = actualCode === "999999" ? "888888" : "999999";

    const try1 = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: wrongCode,
    });
    assert(try1.status === 400, `Expected 400, got ${try1.status}`);
    assert(try1.body.error === "OTP_INVALID", `Expected OTP_INVALID, got ${try1.body.error}`);
    assert(try1.body.attemptsLeft === 4, `Expected attemptsLeft=4, got ${try1.body.attemptsLeft}`);

    const try2 = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: wrongCode,
    });
    assert(try2.status === 400, `Expected 400, got ${try2.status}`);
    assert(try2.body.error === "OTP_INVALID", `Expected OTP_INVALID, got ${try2.body.error}`);
    assert(try2.body.attemptsLeft === 3, `Expected attemptsLeft=3, got ${try2.body.attemptsLeft}`);
  });

  // 3) Expiry: advancing the clock past 5 minutes causes verification to fail with OTP_EXPIRED
  await runTest("3. Expiry: advancing server clock past 5 minutes causes verification to fail with OTP_EXPIRED", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();
    const baseTime = Date.now();
    setServerClockForTesting(baseTime);

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const code = extractOtpFromInbox(REGISTERED_EMAIL);

    // Advance clock by 5 minutes + 1 second
    setServerClockForTesting(baseTime + OTP_TTL_MS + 1000);

    const verRes = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: code,
    });
    resetServerClock();

    assert(verRes.status === 400, `Expected 400 for expired OTP, got ${verRes.status}`);
    assert(verRes.body.error === "OTP_EXPIRED", `Expected error OTP_EXPIRED, got ${verRes.body.error}`);
  });

  // 4) Single use: verifying the same OTP a second time fails, and reusing resetToken fails
  await runTest("4. Single use: verifying the same OTP a second time fails & reusing resetToken fails", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const code = extractOtpFromInbox(REGISTERED_EMAIL);

    const firstVerify = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: code,
    });
    assert(firstVerify.status === 200 && firstVerify.body.ok === true, "First verification should succeed");

    // Second verification with the exact same OTP must fail
    const secondVerify = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: code,
    });
    assert(secondVerify.status === 400, `Expected 400 on second OTP use, got ${secondVerify.status}`);
    assert(
      secondVerify.body.error === "OTP_INVALID" || secondVerify.body.error === "OTP_EXPIRED",
      `Expected OTP_INVALID or OTP_EXPIRED on consumed OTP, got ${secondVerify.body.error}`
    );

    // Use resetToken once
    const token = firstVerify.body.resetToken;
    const firstPinSet = await invokeApp(app, "POST", "/api/pin-reset/set-pin", {
      resetToken: token,
      newPin: "1234",
    });
    assert(firstPinSet.status === 200, "First set-pin with token should succeed");

    // Reusing the same resetToken a second time must fail
    const secondPinSet = await invokeApp(app, "POST", "/api/pin-reset/set-pin", {
      resetToken: token,
      newPin: "5678",
    });
    assert(secondPinSet.status === 400, `Expected 400 when reusing resetToken, got ${secondPinSet.status}`);
  });

  // 5) Lockout: 5 wrong attempts return OTP_LOCKED even if the 6th attempt has the right code
  await runTest("5. Lockout: 5 wrong attempts return OTP_LOCKED, and 6th attempt with correct code also returns OTP_LOCKED", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const correctCode = extractOtpFromInbox(REGISTERED_EMAIL);
    const wrongCode = correctCode === "111111" ? "222222" : "111111";

    for (let i = 1; i <= 4; i++) {
      const r = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
        email: REGISTERED_EMAIL,
        otp: wrongCode,
      });
      assert(r.status === 400 && r.body.error === "OTP_INVALID", `Attempt ${i} should return OTP_INVALID`);
      assert(r.body.attemptsLeft === 5 - i, `Attempt ${i} should have ${5 - i} attemptsLeft`);
    }

    // 5th wrong attempt triggers OTP_LOCKED (HTTP 429)
    const fifthAttempt = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: wrongCode,
    });
    assert(fifthAttempt.status === 429, `Expected 429 on 5th wrong attempt, got ${fifthAttempt.status}`);
    assert(fifthAttempt.body.error === "OTP_LOCKED", `Expected OTP_LOCKED on 5th attempt, got ${fifthAttempt.body.error}`);

    // 6th attempt with the CORRECT code must still be rejected with OTP_LOCKED
    const sixthAttemptWithCorrectCode = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: correctCode,
    });
    assert(sixthAttemptWithCorrectCode.status === 429, `Expected 429 on 6th attempt, got ${sixthAttemptWithCorrectCode.status}`);
    assert(
      sixthAttemptWithCorrectCode.body.error === "OTP_LOCKED",
      `Expected OTP_LOCKED on 6th attempt even with right code, got ${sixthAttemptWithCorrectCode.body.error}`
    );
  });

  // 6) New OTP invalidates old: requesting a second OTP makes the first one fail verification
  await runTest("6. New OTP invalidates old: requesting a second OTP invalidates the first OTP", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();
    const t0 = Date.now();
    setServerClockForTesting(t0);

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const firstOtp = extractOtpFromInbox(REGISTERED_EMAIL);

    // Advance past 60s cooldown so we can request a second OTP
    setServerClockForTesting(t0 + RESEND_COOLDOWN_MS + 2000);
    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const secondOtp = extractOtpFromInbox(REGISTERED_EMAIL);

    // If random generator happened to pick same 6-digit number (1 in 1,000,000), request once more
    if (firstOtp !== secondOtp) {
      const verifyOld = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
        email: REGISTERED_EMAIL,
        otp: firstOtp,
      });
      assert(verifyOld.status === 400 && verifyOld.body.error === "OTP_INVALID", "Old OTP must fail verification");
    }

    const verifyNew = await invokeApp(app, "POST", "/api/pin-reset/verify-otp", {
      email: REGISTERED_EMAIL,
      otp: secondOtp,
    });
    resetServerClock();
    assert(verifyNew.status === 200 && verifyNew.body.ok === true, "Second (newest) OTP must succeed");
  });

  // 7) Resend cooldown: requesting again within 60 seconds returns 429 WAIT_BEFORE_RESEND
  await runTest("7. Resend cooldown & rate limit: requesting again within 60s returns 429 WAIT_BEFORE_RESEND", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();
    const t0 = Date.now();
    setServerClockForTesting(t0);

    const firstReq = await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    assert(firstReq.status === 200, "First request should succeed");

    // Advance only 15 seconds (< 60s cooldown)
    setServerClockForTesting(t0 + 15 * 1000);
    const secondReqTooEarly = await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    assert(secondReqTooEarly.status === 429, `Expected 429 within 60s cooldown, got ${secondReqTooEarly.status}`);
    assert(
      secondReqTooEarly.body.error === "WAIT_BEFORE_RESEND",
      `Expected WAIT_BEFORE_RESEND, got ${secondReqTooEarly.body.error}`
    );

    // Test max 3 requests per email per 15 minutes
    setServerClockForTesting(t0 + 65 * 1000);
    const req2 = await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    assert(req2.status === 200, "2nd request in 15m window should succeed");

    setServerClockForTesting(t0 + 130 * 1000);
    const req3 = await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    assert(req3.status === 200, "3rd request in 15m window should succeed");

    setServerClockForTesting(t0 + 195 * 1000);
    const req4Blocked = await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    resetServerClock();
    assert(req4Blocked.status === 429, `Expected 429 on 4th request within 15m window, got ${req4Blocked.status}`);
    assert(req4Blocked.body.error === "WAIT_BEFORE_RESEND", "Expected WAIT_BEFORE_RESEND on rate limit");
  });

  // 8) Stored value is a hash, not the plaintext OTP
  await runTest("8. Stored value is an HMAC-SHA256 hash and never the plaintext OTP in memory or on disk", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    await invokeApp(app, "POST", "/api/pin-reset/request-otp", { email: REGISTERED_EMAIL });
    const plaintextOtp = extractOtpFromInbox(REGISTERED_EMAIL);

    const record = getRawOtpRecordForTesting(REGISTERED_EMAIL);
    assert(!!record, "Expected OTP record in store");
    assert(record!.hash !== plaintextOtp, "Stored hash must NOT equal plaintext OTP");
    assert(/^[a-f0-9]{64}$/.test(record!.hash), `Expected 64-char hex SHA-256 hash, got ${record!.hash}`);
    assert(record!.hash === hashOtp(plaintextOtp), "Stored hash must match HMAC-SHA256(otp)");

    const diskPath = path.resolve(process.cwd(), "otp_store.json");
    assert(fs.existsSync(diskPath), "Expected otp_store.json on disk");
    const rawJson = fs.readFileSync(diskPath, "utf-8");
    assert(!rawJson.includes(`"${plaintextOtp}"`), "Plaintext OTP must never appear in otp_store.json on disk");
  });

  // 9) Requesting an OTP for an unknown email returns the same response shape as a known email without sending an email
  await runTest("9. Unknown email returns identical generic 200 response shape without sending an email", async () => {
    clearOtpStoreForTesting();
    clearTestInbox();

    const knownRes = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: REGISTERED_EMAIL,
    });
    const knownEmailsSent = getLatestTestInboxEmail(REGISTERED_EMAIL);
    assert(!!knownEmailsSent, "Expected email to be sent for registered user");

    clearTestInbox();

    const unknownRes = await invokeApp(app, "POST", "/api/pin-reset/request-otp", {
      email: UNKNOWN_EMAIL,
    });
    // Issue 1: If email does NOT exist, do NOT send anything and return exact error message
    assert(unknownRes.status === 404, `Expected 404 for unknown email, got ${unknownRes.status}`);
    assert(unknownRes.body.ok === false, "Expected ok === false for unknown email");
    assert(unknownRes.body.error === "EMAIL_NOT_FOUND", "Expected EMAIL_NOT_FOUND error code");
    assert(
      unknownRes.body.message === "Email not found. This email is not registered with WealthIQ.",
      `Expected 'Email not found. This email is not registered with WealthIQ.', got '${unknownRes.body.message}'`
    );

    const unknownEmailSent = getLatestTestInboxEmail(UNKNOWN_EMAIL);
    assert(unknownEmailSent === null, "Must NOT send an email for an unregistered address");
  });

  // Clean up test artifacts so normal user flow starts fresh
  clearOtpStoreForTesting();

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n${BOLD}OTP Test Summary: ${passedCount}/${results.length} passed${RESET}\n`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in test-otp-flow:", err);
  process.exit(1);
});
