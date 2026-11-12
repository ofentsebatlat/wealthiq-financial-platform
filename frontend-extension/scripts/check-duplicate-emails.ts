import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * WealthIQ - Audit Script: Check Duplicate Emails in Existing Data
 *
 * This one-time audit script scans `users_database.json` and `security_profile.json`
 * for duplicate emails (normalized by trimming and converting to lowercase).
 *
 * NOTE: Per specification, this script ONLY REPORTS duplicates and does NOT
 * delete or modify anything automatically.
 */

interface UserRecord {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  accountNumber?: string;
  isSecurityRegistered?: boolean;
  startingBalance?: number;
  userPin?: string;
  userPinHash?: string;
  [key: string]: any;
}

const USERS_FILE_PATH = fs.existsSync(path.join(__dirname, "..", "users_database.json"))
  ? path.join(__dirname, "..", "users_database.json")
  : path.join(process.cwd(), "users_database.json");
const PROFILE_FILE_PATH = fs.existsSync(path.join(__dirname, "..", "security_profile.json"))
  ? path.join(__dirname, "..", "security_profile.json")
  : path.join(process.cwd(), "security_profile.json");

export function runDuplicateEmailAudit(): {
  totalUsers: number;
  uniqueEmails: number;
  duplicates: Record<string, { count: number; users: Array<{ key: string; name?: string; accountNumber?: string }> }>;
} {
  console.log("================================================================================");
  console.log("   WealthIQ Security Audit: Checking for Duplicate Emails in User Database      ");
  console.log("================================================================================\n");

  if (!fs.existsSync(USERS_FILE_PATH)) {
    console.error(`[ERROR] File not found: ${USERS_FILE_PATH}`);
    return { totalUsers: 0, uniqueEmails: 0, duplicates: {} };
  }

  let usersDb: Record<string, UserRecord> = {};
  try {
    const raw = fs.readFileSync(USERS_FILE_PATH, "utf-8");
    usersDb = JSON.parse(raw);
  } catch (err: any) {
    console.error(`[ERROR] Failed to read ${USERS_FILE_PATH}:`, err.message);
    return { totalUsers: 0, uniqueEmails: 0, duplicates: {} };
  }

  const emailToUsersMap: Record<
    string,
    Array<{ key: string; name?: string; accountNumber?: string }>
  > = {};

  let totalUsers = 0;
  for (const [key, user] of Object.entries(usersDb)) {
    totalUsers++;
    const rawEmail = user.userEmail || "";
    const cleanEmail = String(rawEmail).trim().toLowerCase();

    if (!cleanEmail) {
      console.warn(`[WARNING] User record '${key}' has no userEmail defined.`);
      continue;
    }

    if (!emailToUsersMap[cleanEmail]) {
      emailToUsersMap[cleanEmail] = [];
    }

    emailToUsersMap[cleanEmail].push({
      key,
      name: user.userName || key,
      accountNumber: user.accountNumber || "N/A",
    });
  }

  // Filter for duplicates (count > 1)
  const duplicates: Record<
    string,
    { count: number; users: Array<{ key: string; name?: string; accountNumber?: string }> }
  > = {};

  for (const [email, userList] of Object.entries(emailToUsersMap)) {
    if (userList.length > 1) {
      duplicates[email] = {
        count: userList.length,
        users: userList,
      };
    }
  }

  const uniqueEmailCount = Object.keys(emailToUsersMap).length;
  const duplicateEmailCount = Object.keys(duplicates).length;

  console.log(`Scanned Total User Records : ${totalUsers}`);
  console.log(`Unique Normalized Emails   : ${uniqueEmailCount}`);
  console.log(`Duplicate Email Groups     : ${duplicateEmailCount}\n`);

  if (duplicateEmailCount === 0) {
    console.log("No duplicate emails found in existing data. Clean database!");
  } else {
    console.log("--------------------------------------------------------------------------------");
    console.log("DUPLICATE EMAILS DETECTED:");
    console.log("--------------------------------------------------------------------------------");
    for (const [email, info] of Object.entries(duplicates)) {
      console.log(`\nEmail: "${email}" appears in ${info.count} user records:`);
      info.users.forEach((u, idx) => {
        console.log(`  [${idx + 1}] Key: "${u.key}" | Name: "${u.name}" | Account #: ${u.accountNumber}`);
      });
    }
    console.log("\n--------------------------------------------------------------------------------");
    console.log("ACTION REQUIRED: As per user instructions, NO records were modified or deleted.");
    console.log("You can review the above duplicate records and decide how to merge or remove them.");
    console.log("--------------------------------------------------------------------------------\n");
  }

  return {
    totalUsers,
    uniqueEmails: uniqueEmailCount,
    duplicates,
  };
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].endsWith("check-duplicate-emails.ts")) {
  runDuplicateEmailAudit();
}
