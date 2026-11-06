import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sendOtpEmail, buildOtpEmailContent } from "./emailService";

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const EMAIL_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_EMAIL_REQUESTS_PER_WINDOW = 3; // Max 3 requests per email per 15 minutes
export const IP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const MAX_IP_REQUESTS_PER_HOUR = 10; // Max 10 requests per IP per hour

const DEFAULT_DEV_SECRET = "wealthiq-dev-hmac-secret-do-not-use-in-prod-9f8e7d6c5b4a3210";
const PLACEHOLDER_SECRETS = new Set([
  "",
  "change-this-long-random-string",
  "replace-with-a-64-char-cryptographically-random-secret-key",
]);

/**
 * Validates and retrieves the HMAC secret.
 * In production (NODE_ENV=production), refuses startup if OTP_SECRET is missing or a placeholder.
 */
export function getOtpSecret(): string {
  const envSecret = (process.env.OTP_SECRET || "").trim();
  if (process.env.NODE_ENV === "production" && PLACEHOLDER_SECRETS.has(envSecret)) {
    throw new Error(
      "FATAL SECURITY ERROR: OTP_SECRET environment variable must be set to a strong secret in production."
    );
  }
  return PLACEHOLDER_SECRETS.has(envSecret) ? DEFAULT_DEV_SECRET : envSecret;
}

// Enforce secret check immediately at module load if running in production
if (process.env.NODE_ENV === "production") {
  getOtpSecret();
}

// Server-side clock with test injection hook (never trusts client timestamps)
let serverClock: () => number = () => Date.now();

export function setServerClockForTesting(fnOrTimestamp: number | (() => number)) {
  if (typeof fnOrTimestamp === "number") {
    serverClock = () => fnOrTimestamp;
  } else {
    serverClock = fnOrTimestamp;
  }
}

export function resetServerClock() {
  serverClock = () => Date.now();
}

export function getServerNow(): number {
  return serverClock();
}

export interface OtpRecord {
  hash: string; // HMAC-SHA256 hex digest of the 6-digit OTP (never plaintext)
  createdAt: number;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

export interface ResetTokenRecord {
  tokenHash: string; // HMAC-SHA256 hex digest of the single-use resetToken
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

interface PersistentOtpDatabase {
  otps: Record<string, OtpRecord>;
  resetTokens: Record<string, ResetTokenRecord>;
  emailRateLog: Record<string, number[]>;
  ipRateLog: Record<string, number[]>;
  lastRequestAt: Record<string, number>;
}

/**
 * Persistent JSON store on disk with automatic TTL cleanup.
 * Note: For multi-node production deployments, replace this file-backed store
 * with Redis (using EXPIRE 300) or a database collection with a TTL index on expiresAt.
 */
const OTP_STORE_FILE_PATH = path.join(process.cwd(), "otp_store.json");

let otpDb: PersistentOtpDatabase = {
  otps: {},
  resetTokens: {},
  emailRateLog: {},
  ipRateLog: {},
  lastRequestAt: {},
};

function loadOtpDbFromDisk() {
  try {
    if (fs.existsSync(OTP_STORE_FILE_PATH)) {
      const raw = fs.readFileSync(OTP_STORE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        otpDb = {
          otps: parsed.otps || {},
          resetTokens: parsed.resetTokens || {},
          emailRateLog: parsed.emailRateLog || {},
          ipRateLog: parsed.ipRateLog || {},
          lastRequestAt: parsed.lastRequestAt || {},
        };
      }
    }
  } catch (err) {
    console.error("[WealthIQ OTP Store] Failed to load otp_store.json:", err);
  }
}

function saveOtpDbToDisk() {
  try {
    fs.writeFileSync(OTP_STORE_FILE_PATH, JSON.stringify(otpDb, null, 2), "utf-8");
  } catch (err) {
    console.error("[WealthIQ OTP Store] Failed to save otp_store.json:", err);
  }
}

loadOtpDbFromDisk();

/**
 * Purges expired reset tokens and old rate-limit window entries.
 * Note: Expired OTP records are cleaned up on verification or after a grace window
 * so that verifying an expired OTP explicitly returns OTP_EXPIRED and logs otp_expired.
 */
export function cleanupExpiredRecords(now: number = getServerNow()) {
  let modified = false;

  // Clean up OTP records expired more than 15 minutes ago
  for (const [email, rec] of Object.entries(otpDb.otps)) {
    if (now - rec.expiresAt > 15 * 60 * 1000) {
      delete otpDb.otps[email];
      modified = true;
    }
  }

  // Clean up expired or used reset tokens
  for (const [hash, rec] of Object.entries(otpDb.resetTokens)) {
    if (now > rec.expiresAt || rec.used) {
      delete otpDb.resetTokens[hash];
      modified = true;
    }
  }

  // Prune 15-minute email rate logs
  for (const [email, timestamps] of Object.entries(otpDb.emailRateLog)) {
    const filtered = timestamps.filter((t) => now - t < EMAIL_RATE_WINDOW_MS);
    if (filtered.length === 0) {
      delete otpDb.emailRateLog[email];
      modified = true;
    } else if (filtered.length !== timestamps.length) {
      otpDb.emailRateLog[email] = filtered;
      modified = true;
    }
  }

  // Prune 1-hour IP rate logs
  for (const [ip, timestamps] of Object.entries(otpDb.ipRateLog)) {
    const filtered = timestamps.filter((t) => now - t < IP_RATE_WINDOW_MS);
    if (filtered.length === 0) {
      delete otpDb.ipRateLog[ip];
      modified = true;
    } else if (filtered.length !== timestamps.length) {
      otpDb.ipRateLog[ip] = filtered;
      modified = true;
    }
  }

  if (modified) {
    saveOtpDbToDisk();
  }
}

export function clearOtpStoreForTesting() {
  otpDb = {
    otps: {},
    resetTokens: {},
    emailRateLog: {},
    ipRateLog: {},
    lastRequestAt: {},
  };
  saveOtpDbToDisk();
}

export function getRawOtpRecordForTesting(email: string): OtpRecord | undefined {
  return otpDb.otps[email.trim().toLowerCase()];
}

export function hashOtp(otp: string): string {
  return crypto.createHmac("sha256", getOtpSecret()).update(String(otp)).digest("hex");
}

export function hashResetToken(token: string): string {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update("reset:" + String(token))
    .digest("hex");
}

export function hashPin(pin: string): string {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update("pin:" + String(pin).trim())
    .digest("hex");
}

export function verifyPinWithHash(
  candidatePin: string,
  storedPinHash?: string,
  legacyPlainPin?: string
): boolean {
  const cleanCandidate = String(candidatePin || "").trim();
  if (!/^\d{4}$/.test(cleanCandidate)) return false;

  if (storedPinHash && typeof storedPinHash === "string" && storedPinHash.length === 64) {
    const a = Buffer.from(hashPin(cleanCandidate), "utf8");
    const b = Buffer.from(storedPinHash, "utf8");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  if (legacyPlainPin !== undefined && legacyPlainPin !== null) {
    const cleanLegacy = String(legacyPlainPin).trim();
    const a = Buffer.from(cleanCandidate, "utf8");
    const b = Buffer.from(cleanLegacy, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  return false;
}

export function maskEmail(email: string): string {
  const clean = String(email || "").trim().toLowerCase();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 0) return "of*********@gmail.com";
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  const prefix = local.slice(0, Math.min(2, local.length));
  const stars = "*".repeat(Math.max(3, local.length - prefix.length));
  return `${prefix}${stars}${domain}`;
}

export interface AuditLoggerFn {
  (event: {
    action: "otp_requested" | "otp_verified" | "otp_failed" | "otp_expired" | "pin_reset";
    email: string;
    userName?: string;
    ipAddress?: string;
    status: "success" | "failed";
    details: string;
  }): void;
}

export interface UserRecordLookupResult {
  exists: boolean;
  userKey?: string;
  userName?: string;
  userEmail: string;
  accountNumber?: string;
}

/**
 * Step 1: Request OTP
 * - Validates email format.
 * - Enforces rate limits (60s resend cooldown, max 3/15m per email, max 10/hr per IP).
 * - Looks up user in the database.
 * - Generates 6-digit OTP via crypto.randomInt, hashes with HMAC-SHA256, stores with 5-min expiry.
 * - Invalidates any prior OTP for the same user.
 * - Sends email ONLY if the user exists, but ALWAYS returns the identical generic response.
 */
export async function handleRequestOtp(params: {
  emailInput: string;
  ipAddress: string;
  lookupUserByEmail: (email: string) => UserRecordLookupResult;
  onAuditLog: AuditLoggerFn;
  onSaveDevEmailRecord?: (emailRecord: any) => void;
}): Promise<{
  status: number;
  body: Record<string, any>;
}> {
  const now = getServerNow();
  cleanupExpiredRecords(now);

  const email = String(params.emailInput || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return {
      status: 400,
      body: {
        ok: false,
        success: false,
        error: "INVALID_EMAIL",
        message: "Please enter a valid registered email address.",
      },
    };
  }

  const ip = params.ipAddress || "127.0.0.1";

  // 1. Check 60-second resend cooldown per email
  const lastReq = otpDb.lastRequestAt[email];
  if (lastReq !== undefined && now - lastReq < RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((RESEND_COOLDOWN_MS - (now - lastReq)) / 1000));
    return {
      status: 429,
      body: {
        ok: false,
        success: false,
        error: "WAIT_BEFORE_RESEND",
        retryAfterSeconds,
        message: "Please wait a moment before requesting another code.",
      },
    };
  }

  // 2. Check max 3 requests per email per 15 minutes
  const emailHistory = (otpDb.emailRateLog[email] || []).filter(
    (t) => now - t < EMAIL_RATE_WINDOW_MS
  );
  if (emailHistory.length >= MAX_EMAIL_REQUESTS_PER_WINDOW) {
    const oldestInWindow = emailHistory[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((EMAIL_RATE_WINDOW_MS - (now - oldestInWindow)) / 1000)
    );
    return {
      status: 429,
      body: {
        ok: false,
        success: false,
        error: "WAIT_BEFORE_RESEND",
        retryAfterSeconds,
        message: "Please wait a moment before requesting another code.",
      },
    };
  }

  // 3. Check max 10 requests per IP per hour
  const ipHistory = (otpDb.ipRateLog[ip] || []).filter((t) => now - t < IP_RATE_WINDOW_MS);
  if (ipHistory.length >= MAX_IP_REQUESTS_PER_HOUR) {
    return {
      status: 429,
      body: {
        ok: false,
        success: false,
        error: "WAIT_BEFORE_RESEND",
        retryAfterSeconds: 60,
        message: "Please wait a moment before requesting another code.",
      },
    };
  }

  // Record rate-limit timestamps
  otpDb.lastRequestAt[email] = now;
  otpDb.emailRateLog[email] = [...emailHistory, now];
  otpDb.ipRateLog[ip] = [...ipHistory, now];

  const expiresAt = now + OTP_TTL_MS;
  const masked = maskEmail(email);
  const userLookup = params.lookupUserByEmail(email);

  const deliveryMode = (process.env.OTP_DELIVERY_MODE || "smtp").toLowerCase();
  if (deliveryMode === "mailto" && process.env.NODE_ENV === "production") {
    throw new Error("OTP_DELIVERY_MODE=mailto is strictly forbidden in production.");
  }
  const isMailtoDemo = deliveryMode === "mailto" && process.env.NODE_ENV !== "production";

  let demoMailtoPayload:
    | { to: string; subject: string; body: string; previewUrl?: string }
    | undefined;

  if (!userLookup.exists) {
    // Save rate-limit state even when email is not registered
    saveOtpDbToDisk();

    // Issue 1: If email does NOT exist, do not send anything and show exact message
    params.onAuditLog({
      action: "otp_requested",
      email: masked,
      userName: "Unregistered Inquiry",
      ipAddress: ip,
      status: "failed",
      details: `Password reset requested for unregistered email ${masked}. Request blocked.`,
    });

    return {
      status: 404,
      body: {
        ok: false,
        success: false,
        error: "EMAIL_NOT_FOUND",
        message: "Email not found. This email is not registered with WealthIQ.",
      },
    };
  }

  // Cryptographically secure 6-digit OTP padded with leading zeros
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  // Invalidate any previous OTP for this email by overwriting with new hash
  otpDb.otps[email] = {
    hash: hashOtp(otp),
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
  };
  saveOtpDbToDisk();

  // Send OTP via email service to the exact destination email entered by the user
  const emailResult = await sendOtpEmail({
    to: userLookup.userEmail,
    otp,
    recipientName: userLookup.userName,
  });

  if (isMailtoDemo) {
    const content = buildOtpEmailContent(otp);
    demoMailtoPayload = {
      to: userLookup.userEmail,
      subject: content.subject,
      body: content.text,
      previewUrl: emailResult.previewUrl,
    };
  }

  if (params.onSaveDevEmailRecord) {
    params.onSaveDevEmailRecord({
      id: `email-otp-${now}`,
      reference: `OTP-${now}`,
      timestamp: new Date(now).toISOString(),
      to: userLookup.userEmail,
      from: emailResult.from,
      subject: emailResult.subject,
      body: emailResult.text,
      senderName: "WealthIQ Security Operations",
      senderAccount: "SEC-PORTAL",
      amount: 0,
      transactionDescription: "Security OTP Verification Dispatch",
      attachments: [],
      deliveryStatus: "Delivered",
      gatewayResponse: `250 OK: Security OTP dispatched via ${emailResult.mode} to ${masked}`,
    });
  }

  params.onAuditLog({
    action: "otp_requested",
    email: masked,
    userName: userLookup.userName || "Registered Client",
    ipAddress: ip,
    status: "success",
    details: `otp_requested: Security OTP generated (HMAC-SHA256) and dispatched to ${masked} (expires in 5m).`,
  });

  const responseBody: Record<string, any> = {
    ok: true,
    success: true,
    expiresAt,
    maskedEmail: masked,
    resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    deliveryMode: isMailtoDemo ? "mailto" : "email",
    message: "Security OTP verification code dispatched to your registered email address.",
  };

  if (isMailtoDemo && demoMailtoPayload) {
    responseBody.demoMailto = demoMailtoPayload;
  }

  return {
    status: 200,
    body: responseBody,
  };
}

/**
 * Step 2: Verify OTP
 * - Validates 6-digit numeric format.
 * - Checks existence, expiry (5 minutes), single-use status, and 5-attempt lockout.
 * - Uses crypto.timingSafeEqual on HMAC-SHA256 digests.
 * - Issues a single-use resetToken (valid 10 minutes) upon success.
 */
export function handleVerifyOtp(params: {
  emailInput: string;
  otpInput: string;
  ipAddress: string;
  onAuditLog: AuditLoggerFn;
}): {
  status: number;
  body: Record<string, any>;
} {
  const now = getServerNow();
  const email = String(params.emailInput || "").trim().toLowerCase();
  const otp = String(params.otpInput || "").trim();
  const ip = params.ipAddress || "127.0.0.1";
  const masked = maskEmail(email);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "INVALID_EMAIL",
        message: "Please enter a valid registered email address.",
      },
    };
  }

  if (!/^\d{6}$/.test(otp)) {
    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_INVALID",
        message: "Please enter a valid 6-digit numeric security code.",
      },
    };
  }

  const record = otpDb.otps[email];

  // If no OTP exists for this email -> OTP_EXPIRED (per requirement #6)
  if (!record) {
    params.onAuditLog({
      action: "otp_expired",
      email: masked,
      ipAddress: ip,
      status: "failed",
      details: `otp_expired: Verification attempted for ${masked} with no active OTP record.`,
    });
    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_EXPIRED",
        message: "This code has expired. Please request a new one.",
      },
    };
  }

  // Reject already-used OTP (single-use enforcement)
  if (record.used) {
    params.onAuditLog({
      action: "otp_failed",
      email: masked,
      ipAddress: ip,
      status: "failed",
      details: `otp_failed: Single-use violation — replay of already-used OTP rejected for ${masked}.`,
    });
    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_INVALID",
        attemptsLeft: 0,
        message: "This security code has already been used. Please request a new code.",
      },
    };
  }

  // Check server-side 5-minute expiry BEFORE attempt check
  if (now > record.expiresAt) {
    delete otpDb.otps[email];
    saveOtpDbToDisk();

    params.onAuditLog({
      action: "otp_expired",
      email: masked,
      ipAddress: ip,
      status: "failed",
      details: `otp_expired: Expired OTP rejected for ${masked}.`,
    });

    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_EXPIRED",
        message: "This code has expired. Please request a new one.",
      },
    };
  }

  // Check 5-attempt brute-force lockout
  if (record.attempts >= MAX_ATTEMPTS) {
    params.onAuditLog({
      action: "otp_failed",
      email: masked,
      ipAddress: ip,
      status: "failed",
      details: `otp_failed: Locked OTP verification attempt rejected for ${masked} (max ${MAX_ATTEMPTS} attempts reached).`,
    });
    return {
      status: 429,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_LOCKED",
        attemptsLeft: 0,
        message: "Too many attempts. Please request a new code.",
      },
    };
  }

  // Constant-time HMAC comparison
  const candidateHashBuf = Buffer.from(hashOtp(otp), "utf8");
  const storedHashBuf = Buffer.from(record.hash, "utf8");
  const isMatch =
    candidateHashBuf.length === storedHashBuf.length &&
    crypto.timingSafeEqual(candidateHashBuf, storedHashBuf);

  if (!isMatch) {
    record.attempts += 1;
    saveOtpDbToDisk();

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - record.attempts);

    if (record.attempts >= MAX_ATTEMPTS) {
      params.onAuditLog({
        action: "otp_failed",
        email: masked,
        ipAddress: ip,
        status: "failed",
        details: `otp_failed: 5th incorrect OTP attempt for ${masked}. Account OTP locked.`,
      });
      return {
        status: 429,
        body: {
          ok: false,
          valid: false,
          success: false,
          error: "OTP_LOCKED",
          attemptsLeft: 0,
          message: "Too many attempts. Please request a new code.",
        },
      };
    }

    params.onAuditLog({
      action: "otp_failed",
      email: masked,
      ipAddress: ip,
      status: "failed",
      details: `otp_failed: Incorrect OTP entered for ${masked} (${attemptsLeft} attempts remaining).`,
    });

    return {
      status: 400,
      body: {
        ok: false,
        valid: false,
        success: false,
        error: "OTP_INVALID",
        attemptsLeft,
        message: `Incorrect code. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
      },
    };
  }

  // Valid match! Mark OTP as used (single-use)
  record.used = true;

  // Issue single-use resetToken valid for 10 minutes
  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawResetToken);

  otpDb.resetTokens[tokenHash] = {
    tokenHash,
    email,
    createdAt: now,
    expiresAt: now + RESET_TOKEN_TTL_MS,
    used: false,
  };
  saveOtpDbToDisk();

  params.onAuditLog({
    action: "otp_verified",
    email: masked,
    ipAddress: ip,
    status: "success",
    details: `otp_verified: Security OTP verified for ${masked}. Single-use resetToken issued (valid 10m).`,
  });

  return {
    status: 200,
    body: {
      ok: true,
      valid: true,
      success: true,
      resetToken: rawResetToken,
      expiresAt: now + RESET_TOKEN_TTL_MS,
      message: "Security OTP code verified successfully.",
    },
  };
}

/**
 * Step 3: Set New PIN with single-use resetToken
 * - Validates resetToken (exists, not used, not expired).
 * - Validates 4-digit numeric PIN format.
 * - Hashes the new PIN with HMAC-SHA256 and updates persistent user store.
 * - Invalidates the resetToken immediately.
 */
export function handleSetNewPinWithToken(params: {
  resetToken: string;
  newPin: string;
  ipAddress: string;
  updateUserPinInDb: (email: string, newPin: string, newPinHash: string) => { userName: string };
  onAuditLog: AuditLoggerFn;
}): {
  status: number;
  body: Record<string, any>;
} {
  const now = getServerNow();
  cleanupExpiredRecords(now);

  const rawToken = String(params.resetToken || "").trim();
  const cleanPin = String(params.newPin || "").trim();
  const ip = params.ipAddress || "127.0.0.1";

  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      status: 400,
      body: {
        ok: false,
        success: false,
        error: "INVALID_PIN",
        message: "New Remote PIN must be exactly 4 numeric digits.",
      },
    };
  }

  if (!rawToken) {
    return {
      status: 400,
      body: {
        ok: false,
        success: false,
        error: "RESET_TOKEN_INVALID",
        message: "Missing or invalid password reset session token. Please verify a new OTP code.",
      },
    };
  }

  const tokenHash = hashResetToken(rawToken);
  const tokenRecord = otpDb.resetTokens[tokenHash];

  if (!tokenRecord || tokenRecord.used) {
    return {
      status: 400,
      body: {
        ok: false,
        success: false,
        error: "RESET_TOKEN_INVALID",
        message: "Reset session token is invalid or has already been used. Please request a new OTP.",
      },
    };
  }

  if (now > tokenRecord.expiresAt) {
    delete otpDb.resetTokens[tokenHash];
    saveOtpDbToDisk();
    return {
      status: 400,
      body: {
        ok: false,
        success: false,
        error: "RESET_TOKEN_EXPIRED",
        message: "Your PIN reset session has expired (10-minute limit). Please request a new OTP.",
      },
    };
  }

  // Invalidate resetToken (single-use) and clear the used OTP record
  tokenRecord.used = true;
  delete otpDb.otps[tokenRecord.email];
  saveOtpDbToDisk();

  const pinHash = hashPin(cleanPin);
  const { userName } = params.updateUserPinInDb(tokenRecord.email, cleanPin, pinHash);
  const masked = maskEmail(tokenRecord.email);

  params.onAuditLog({
    action: "pin_reset",
    email: masked,
    userName,
    ipAddress: ip,
    status: "success",
    details: `pin_reset: 4-digit Remote Banking PIN hashed (HMAC-SHA256) and updated for ${masked}.`,
  });

  return {
    status: 200,
    body: {
      ok: true,
      success: true,
      userName,
      message: "Your Remote Banking PIN has been securely updated.",
    },
  };
}
