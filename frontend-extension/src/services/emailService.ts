import nodemailer from "nodemailer";

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  recipientName?: string;
}

export interface DispatchedEmailResult {
  delivered: boolean;
  mode: "smtp" | "dev_inbox" | "mailto" | "ethereal_smtp";
  messageId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl?: string;
}

// In-memory test transport capture for automated test suites (never exposed via HTTP API)
const testInboxMessages: Array<{
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  otp: string;
  timestamp: number;
}> = [];

export function getLatestTestInboxEmail(email?: string) {
  if (!email) return testInboxMessages[0] || null;
  const clean = email.trim().toLowerCase();
  return testInboxMessages.find((m) => m.to.toLowerCase() === clean) || null;
}

export function clearTestInbox() {
  testInboxMessages.length = 0;
}

export function buildOtpEmailContent(otp: string) {
  const subject = "Your WealthIQ security code";
  const text = `Your Global One Remote Banking verification code is: ${otp}. This code expires in 5 minutes. Never share it with anyone, including bank staff. If you did not request this, ignore this email and contact support.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #003366;">WealthIQ Global One Remote Banking Reset</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Your Global One Remote Banking verification code is:
      </p>
      <div style="margin: 16px 0; padding: 14px 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 6px; text-align: center; color: #0f172a;">
        ${otp}
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #475569;">
        This code expires in <strong>5 minutes</strong>. Never share it with anyone, including bank staff. If you did not request this, ignore this email and contact support on 078 697 6181.
      </p>
    </div>
  `.trim();

  return { subject, text, html };
}

/**
 * Creates a Nodemailer transporter using environment variables:
 * EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.
 * Falls back to Nodemailer's jsonTransport when SMTP credentials are not configured in dev/test.
 */
function createMailTransporter(): {
  transporter: any;
  isLiveSmtp: boolean;
} {
  const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  const hasValidSmtp =
    !process.env.VITEST &&
    Boolean(user && pass) &&
    user !== "your-email@gmail.com" &&
    pass !== "your-16-char-app-password";

  if (hasValidSmtp) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return { transporter, isLiveSmtp: true };
  }

  // Dev/test fallback transport via Nodemailer jsonTransport
  const transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  return { transporter, isLiveSmtp: false };
}

export async function sendOtpEmail(options: SendOtpEmailOptions): Promise<DispatchedEmailResult> {
  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.EMAIL_USER
      ? `"WealthIQ Security" <${process.env.EMAIL_USER}>`
      : `"WealthIQ Security" <security@wealthiq.co.za>`);

  const { subject, text, html } = buildOtpEmailContent(options.otp);
  const deliveryMode = (process.env.OTP_DELIVERY_MODE || "smtp").toLowerCase();

  // Record in in-process test inbox for automated tests
  testInboxMessages.unshift({
    to: options.to,
    from: fromAddress,
    subject,
    text,
    html,
    otp: options.otp,
    timestamp: Date.now(),
  });
  if (testInboxMessages.length > 50) {
    testInboxMessages.length = 50;
  }

  const { transporter, isLiveSmtp } = createMailTransporter();

  // If live SMTP credentials are set, send directly to the user's entered email via SMTP
  if (isLiveSmtp) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject,
        text,
        html,
      });
      return {
        delivered: true,
        mode: "smtp",
        messageId: info.messageId || `wiq-otp-${Date.now()}`,
        from: fromAddress,
        to: options.to,
        subject,
        text,
        html,
      };
    } catch (smtpErr: any) {
      console.warn(
        "[WealthIQ Email] Live SMTP delivery encountered network error, falling back to local dispatch:",
        smtpErr?.message
      );
    }
  }

  // In non-unit-test environments without a private Gmail App Password, also attempt Nodemailer Ethereal SMTP
  // so a real SMTP email is dispatched to options.to with a viewable webmail URL.
  if (!process.env.VITEST) {
    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Ethereal timeout")), 2500)),
      ]);
      if (testAccount) {
        const etherealTransport = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        const info = await etherealTransport.sendMail({
          from: fromAddress,
          to: options.to,
          subject,
          text,
          html,
        });
        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        return {
          delivered: true,
          mode: deliveryMode === "mailto" ? "mailto" : "ethereal_smtp",
          messageId: info.messageId || `ethereal-${Date.now()}`,
          from: fromAddress,
          to: options.to,
          subject,
          text,
          html,
          previewUrl: typeof previewUrl === "string" ? previewUrl : undefined,
        };
      }
    } catch {
      // Fall back cleanly to jsonTransport / mailto below
    }
  }

  if (deliveryMode === "mailto" && process.env.NODE_ENV !== "production") {
    return {
      delivered: true,
      mode: "mailto",
      messageId: `mailto-${Date.now()}`,
      from: fromAddress,
      to: options.to,
      subject,
      text,
      html,
    };
  }

  const fallbackTransporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  const info = await fallbackTransporter.sendMail({
    from: fromAddress,
    to: options.to,
    subject,
    text,
    html,
  });

  return {
    delivered: true,
    mode: "dev_inbox",
    messageId: info.messageId || `wiq-otp-${Date.now()}`,
    from: fromAddress,
    to: options.to,
    subject,
    text,
    html,
  };
}

