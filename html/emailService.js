/* ══════════════════════════════════════════════════════════
   services/emailService.js
   Nodemailer wrapper with HTML email templates.
   Templates: password-reset | welcome | email-verify
   Transport is reused (pooled) in production.
══════════════════════════════════════════════════════════ */

const nodemailer = require("nodemailer");
const logger     = require("../config/logger");

/* ── Lazy transporter singleton ── */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: process.env.NODE_ENV === "production",
    maxConnections: 5,
  });

  return _transporter;
}

/* ── Base HTML layout ── */
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>NeViS</title>
</head>
<body style="margin:0;padding:0;background:#06030a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06030a;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#0e060e;border-radius:18px;
                    border:1px solid rgba(210,0,30,.25);
                    box-shadow:0 24px 80px rgba(0,0,0,.7);
                    overflow:hidden;max-width:100%;">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#8b0015,#d1001e);
                     padding:28px 36px;">
            <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:12px;
                      color:#fff;text-transform:uppercase;font-family:Georgia,serif;">
              NEVIS
            </p>
            <p style="margin:4px 0 0;font-size:11px;letter-spacing:3px;
                      color:rgba(255,255,255,.5);text-transform:uppercase;">
              Nevis_G10 · Official Portal
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="margin:0;font-size:11px;color:#5a4a68;line-height:1.7;">
              © 2025 NeViS — Nevis_G10 · This email was sent automatically.<br/>
              If you didn't request this, please ignore it safely.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Reusable button ── */
function ctaButton(href, label) {
  return `<a href="${href}"
     style="display:inline-block;margin:28px 0 8px;padding:16px 40px;
            background:linear-gradient(135deg,#d1001e,#8b0015);
            color:#fff;border-radius:12px;text-decoration:none;
            font-weight:700;font-size:15px;letter-spacing:.4px;
            box-shadow:0 8px 24px rgba(209,0,30,.35);">
    ${label}
  </a>`;
}

/* ══════════════════════════════════════════════════════════
   SEND HELPERS
══════════════════════════════════════════════════════════ */

async function sendMail({ to, subject, html }) {
  const fromName = process.env.EMAIL_FROM_NAME || "NeViS";
  const fromAddr = process.env.EMAIL_FROM_ADDR || process.env.EMAIL_USER;

  try {
    const info = await getTransporter().sendMail({
      from:    `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      html,
    });
    logger.info("Email sent", { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error("Email send failed", { to, subject, error: err.message });
    throw err;
  }
}

/* ── 1. Password Reset ── */
async function sendPasswordReset({ to, username, resetLink }) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:26px;color:#ece5f4;font-weight:700;">
      Password Reset
    </h2>
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;color:#d1001e;
              text-transform:uppercase;font-family:monospace;">
      Security Request
    </p>
    <p style="color:#a496b2;font-size:15px;line-height:1.75;margin:20px 0 0;">
      Hey <strong style="color:#ece5f4;">${username}</strong>, we received a request
      to reset your password. This link expires in
      <strong style="color:#d1001e;">15 minutes</strong>.
    </p>
    ${ctaButton(resetLink, "Reset My Password")}
    <p style="color:#6e627a;font-size:13px;margin:16px 0 0;line-height:1.7;">
      If you didn't request this, your account is safe — just ignore this email.
      <br/>Never share this link with anyone.
    </p>
    <div style="margin-top:24px;padding:14px 18px;background:rgba(209,0,30,.07);
                border-radius:10px;border:1px solid rgba(209,0,30,.2);">
      <p style="margin:0;font-family:monospace;font-size:12px;color:#8a7088;
                word-break:break-all;">
        ${resetLink}
      </p>
    </div>
  `);

  return sendMail({
    to,
    subject: "🔐 NeViS — Reset Your Password",
    html,
  });
}

/* ── 2. Welcome Email ── */
async function sendWelcome({ to, username }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:5500";
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:26px;color:#ece5f4;font-weight:700;">
      Welcome to NeViS!
    </h2>
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;color:#d1001e;
              text-transform:uppercase;font-family:monospace;">
      Account Created
    </p>
    <p style="color:#a496b2;font-size:15px;line-height:1.75;margin:20px 0 0;">
      Hey <strong style="color:#ece5f4;">${username}</strong>! 🎮<br/>
      Your account has been created successfully. You're now part of the
      <strong style="color:#c9aa46;">Nevis_G10</strong> community —
      gaming, anime, and programming await.
    </p>
    ${ctaButton(siteUrl, "Visit the Site")}
    <div style="margin-top:24px;display:flex;gap:12px;">
      <a href="https://www.youtube.com/@Nevis_G10" target="_blank"
         style="color:#d1001e;font-size:13px;text-decoration:none;">
        📺 YouTube
      </a>
      &nbsp;·&nbsp;
      <a href="https://discord.gg/bckre5xV7d" target="_blank"
         style="color:#7289da;font-size:13px;text-decoration:none;">
        💬 Discord
      </a>
      &nbsp;·&nbsp;
      <a href="https://www.instagram.com/nevis_g10/" target="_blank"
         style="color:#e1306c;font-size:13px;text-decoration:none;">
        📸 Instagram
      </a>
    </div>
  `);

  return sendMail({
    to,
    subject: "🎮 Welcome to NeViS — Nevis_G10!",
    html,
  });
}

/* ── 3. Login Notification ── */
async function sendLoginAlert({ to, username, ip, userAgent }) {
  const time = new Date().toUTCString();
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:26px;color:#ece5f4;font-weight:700;">
      New Login Detected
    </h2>
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;color:#c9aa46;
              text-transform:uppercase;font-family:monospace;">
      Security Alert
    </p>
    <p style="color:#a496b2;font-size:15px;line-height:1.75;margin:20px 0 0;">
      Hi <strong style="color:#ece5f4;">${username}</strong>, a new sign-in was
      detected on your account.
    </p>
    <table style="margin-top:20px;width:100%;border-collapse:collapse;">
      ${[["Time", time], ["IP Address", ip || "Unknown"], ["Device", (userAgent || "Unknown").substring(0, 60)]]
        .map(([k, v]) => `<tr>
          <td style="padding:9px 14px;font-size:13px;color:#6e627a;
                     border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;">${k}</td>
          <td style="padding:9px 14px;font-size:13px;color:#ece5f4;
                     border-bottom:1px solid rgba(255,255,255,.05);">${v}</td>
        </tr>`).join("")}
    </table>
    <p style="color:#6e627a;font-size:13px;margin:20px 0 0;line-height:1.7;">
      Not you? Reset your password immediately and contact support.
    </p>
  `);

  return sendMail({
    to,
    subject: "⚠️ NeViS — New login to your account",
    html,
  });
}

module.exports = {
  sendPasswordReset,
  sendWelcome,
  sendLoginAlert,
};
