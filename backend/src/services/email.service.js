/**
 * Senders may only send as their own address when that address is on a domain
 * verified in Resend. EMAIL_SENDER_DOMAINS defaults to the EMAIL_FROM domain.
 */
export const senderBlockedReason = (email) => {
  const sender = String(email || "").trim().toLowerCase();
  const domain = sender.split("@")[1];
  if (!domain) return "Your account has no email address.";

  const domains = (process.env.EMAIL_SENDER_DOMAINS || process.env.EMAIL_FROM || "onboarding@resend.dev")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .map((entry) => (entry.includes("@") ? entry.split("@")[1] : entry));

  if (!domains.includes(domain)) {
    return `Your email domain (${domain}) is not verified for sending in Resend. Ask an administrator to verify it.`;
  }

  // resend.dev is shared: Resend only accepts its own demo address.
  if (domain === "resend.dev" && sender !== String(process.env.EMAIL_FROM || "").toLowerCase()) {
    return "The shared resend.dev sender cannot send as your address. Verify your organization's domain in Resend first.";
  }

  return null;
};

export const sendMail = async ({ from, to, subject, text, html, replyTo }) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error("Email sending is not configured. Set RESEND_API_KEY.");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Email provider rejected the message (${response.status}): ${detail}`);
    error.status = 502;
    throw error;
  }

  return { delivered: true, transport: "resend" };
};

/**
 * Email adapter for invitation delivery.
 * - If RESEND_API_KEY is configured, sends via Resend API.
 * - Else if EMAIL_WEBHOOK_URL is configured, POSTs the message there.
 * - In development, prints the invitation URL to the server console.
 * - In production with no provider, fails loudly without logging the token.
 */
export const sendInvitationEmail = async ({
  to,
  name,
  organizationName,
  inviteUrl,
  isDirectAccount = false,
  password,
}) => {
  const subject = isDirectAccount
    ? `Your ${organizationName} CRM account is ready`
    : `You are invited to ${organizationName} on VSPH CRM`;

  const text = isDirectAccount
    ? [
        `Hello${name ? ` ${name}` : ""},`,
        "",
        `Your account has been created on ${organizationName} CRM.`,
        "Sign in with the following credentials:",
        "",
        `Email: ${to}`,
        `Password: ${password}`,
        "",
        `Open this link to sign in: ${inviteUrl}`,
        "",
        "You can change your password after signing in.",
      ].join("\n")
    : [
        `Hello${name ? ` ${name}` : ""},`,
        "",
        `You have been invited to join ${organizationName} on VSPH CRM.`,
        "Open this link to set your password and activate your account:",
        inviteUrl,
        "",
        "This link can be used once and expires soon. If you were not expecting it, ignore this email.",
      ].join("\n");

  const html = isDirectAccount
    ? `
      <p>Hello${name ? ` ${name}` : ""},</p>
      <p>Your account has been created on <b>${organizationName}</b> CRM.</p>
      <p>Sign in with these credentials:</p>
      <ul>
        <li><b>Email:</b> ${to}</li>
        <li><b>Password:</b> ${password}</li>
      </ul>
      <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Sign in to CRM</a></p>
      <p style="color:#666;font-size:12px;">You can change your password after signing in.</p>
    `
    : `
      <p>Hello${name ? ` ${name}` : ""},</p>
      <p>You have been invited to join <b>${organizationName}</b> on VSPH CRM.</p>
      <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Set your password &amp; activate account</a></p>
      <p style="color:#666;font-size:12px;">This link can be used once and expires soon. If you were not expecting it, ignore this email.</p>
    `;

  // Resend (preferred)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: [to],
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend rejected: ${response.status} ${err}`);
    }
    return { delivered: true, transport: "resend" };
  }

  // Webhook fallback
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EMAIL_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to, subject, text }),
    });
    if (!response.ok) {
      throw new Error(`Email provider rejected the message (${response.status})`);
    }
    return { delivered: true, transport: "webhook" };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("No email provider configured. Set RESEND_API_KEY or EMAIL_WEBHOOK_URL.");
  }

  // Development-only fallback. Never log the token in production.
  console.log(`[invite:dev] ${to} -> ${inviteUrl}`);
  return { delivered: false, transport: "console", devInviteUrl: inviteUrl };
};
