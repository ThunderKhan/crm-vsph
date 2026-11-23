import { createInvitation, inviteUrlFor, reissueInvitation } from "../services/invitation.service.js";
import { sendInvitationEmail } from "../services/email.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export const create = async (req, res) => {
  try {
    const { email, role = "ADMIN" } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const tenantFk = req.user.tenantFk;
    if (!tenantFk) {
      return res.status(400).json({ success: false, message: "No tenant context." });
    }

    const { invitation, token, reused } = await createInvitation({
      tenantFk,
      email,
      role,
      source: "tenant_admin",
      invitedBy: req.user.id,
    });

    if (!token) {
      return res.status(200).json({
        success: true,
        message: "A pending invitation already exists for this email.",
        reused: true,
      });
    }

    const inviteUrl = inviteUrlFor(token);
    await sendInvitationEmail({
      to: email,
      name: email.split("@")[0],
      organizationName: req.user.tenantName || "your organization",
      inviteUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Invitation sent.",
      data: { email, role },
    });
  } catch (error) {
    console.error("Create invitation failed:", error);
    return res.status(500).json({ success: false, message: "Could not send invitation." });
  }
};

export const reissue = async (req, res) => {
  try {
    const { invitationId } = req.body || {};
    const tenantFk = req.user.tenantFk;

    if (!invitationId) {
      return res.status(400).json({ success: false, message: "Invitation ID is required." });
    }

    const { invitation, token } = await reissueInvitation({ invitationId, tenantFk });
    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." });
    }

    const inviteUrl = inviteUrlFor(token);
    await sendInvitationEmail({
      to: invitation.invitation_email,
      name: invitation.invitation_email.split("@")[0],
      organizationName: req.user.tenantName || "your organization",
      inviteUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Invitation resent.",
    });
  } catch (error) {
    console.error("Reissue invitation failed:", error);
    return res.status(500).json({ success: false, message: "Could not resend invitation." });
  }
};

export const preview = async (req, res) => {
  try {
    const invitation = await previewInvitation(req.params.token);
    if (!invitation) {
      return res.status(404).json({ success: false, message: "This invitation link is invalid." });
    }
    return res.status(200).json({ success: true, data: invitation });
  } catch (error) {
    console.error("Invitation preview failed:", error);
    return res.status(500).json({ success: false, message: "Could not load the invitation." });
  }
};

export const accept = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, message: "Invitation token is required." });
    }
    const user = await acceptInvitation(token, password);
    return res.status(200).json({
      success: true,
      message: "Your account is ready. You can sign in now.",
      user: {
        id: user.user_id,
        name: user.user_name,
        email: user.user_email,
        role: user.user_role,
        tenantId: user.tenant_fk,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not activate the account.",
    });
  }
};
