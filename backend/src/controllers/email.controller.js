import { isEmail } from "../lib/onboarding.logic.js";
import { sendMail, senderBlockedReason } from "../services/email.service.js";

// POST /api/emails/send
export const sendContactEmail = async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};

    if (!isEmail(to)) {
      return res.status(400).json({ success: false, message: "A valid recipient email is required." });
    }
    if (!String(subject || "").trim()) {
      return res.status(400).json({ success: false, message: "A subject is required." });
    }
    if (!String(body || "").trim()) {
      return res.status(400).json({ success: false, message: "A message body is required." });
    }

    const from = req.user.email;
    const blocked = senderBlockedReason(from);
    if (blocked) {
      return res.status(400).json({ success: false, message: blocked });
    }

    await sendMail({
      from,
      to: String(to).trim(),
      subject: String(subject).trim(),
      text: String(body),
      replyTo: from,
    });

    return res.status(200).json({ success: true, message: "Email sent." });
  } catch (error) {
    console.error("Send email failed:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not send the email.",
    });
  }
};
