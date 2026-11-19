export const sendInvitationEmail = async ({
  inviteeEmail,
  owner,
  documentTitle,
  role,
  invitationId,
}) => {
  const configuredFrontendUrl = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  const frontendUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredFrontendUrl)
    ? "https://google-docs-three-mu.vercel.app"
    : configuredFrontendUrl || "https://google-docs-three-mu.vercel.app";
  const invitationLink = `${frontendUrl}/invitations/${invitationId}`;
  const logoUrl = `${frontendUrl}/logo.png`;
  const safeDocumentTitle = String(documentTitle || "Untitled document")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const safeRole = String(role || "viewer");
  const brandName = process.env.BREVO_SENDER_NAME || "Docs Workspace";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "Google Docs Clone",
      },
      to: [{ email: inviteeEmail }],
      subject: `You're invited to collaborate on ${documentTitle || "a document"}`,
      htmlContent: `
        <div style="margin:0;padding:36px 12px;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#202124;">
          <div style="max-width:600px;margin:0 auto;">
            <div style="padding:0 8px 18px;color:#5f6b7a;font-size:14px;font-weight:700;letter-spacing:.3px;">${brandName}</div>
            <div style="overflow:hidden;background:#ffffff;border:1px solid #e4e9f0;border-radius:16px;box-shadow:0 8px 28px rgba(24,39,75,.08);">
              <div style="padding:32px 36px;background:#1a73e8;text-align:center;">
                <div style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:16px;background:#ffffff;">
                  <img src="${logoUrl}" alt="My Doc" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:16px;" />
                </div>
                <h1 style="margin:18px 0 0;color:#ffffff;font-size:25px;line-height:1.25;font-weight:700;">You're invited to collaborate</h1>
              </div>
              <div style="padding:32px 36px;">
                <p style="margin:0 0 22px;color:#526071;font-size:15px;line-height:1.7;">${owner} shared a document with you. Open the invitation to review the details and join the workspace.</p>
                <div style="padding:20px 22px;background:#f7f9fc;border:1px solid #e7edf5;border-radius:12px;">
                  <div style="margin-bottom:8px;color:#7a8797;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Shared document</div>
                  <div style="color:#202b3c;font-size:19px;line-height:1.4;font-weight:700;overflow-wrap:anywhere;">${safeDocumentTitle}</div>
                  <div style="margin-top:14px;color:#526071;font-size:13px;">Your access <span style="display:inline-block;margin-left:6px;padding:4px 10px;border-radius:999px;background:#e8f0fe;color:#185abc;font-size:12px;font-weight:700;text-transform:capitalize;">${safeRole}</span></div>
                </div>
                <div style="padding:28px 0 20px;text-align:center;">
                  <a href="${invitationLink}" style="display:inline-block;padding:14px 28px;border-radius:8px;background:#1a73e8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">View invitation</a>
                </div>
                <p style="margin:0;color:#7a8797;font-size:12px;line-height:1.6;text-align:center;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;text-align:center;word-break:break-all;"><a href="${invitationLink}" style="color:#1a73e8;text-decoration:underline;">${invitationLink}</a></p>
              </div>
            </div>
            <p style="margin:18px 8px 0;color:#8a94a3;font-size:11px;line-height:1.6;text-align:center;">You received this email because someone invited you to collaborate on a document.</p>
          </div>
        </div>`,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      `Brevo API error ${response.status}: ${JSON.stringify(result)}`,
    );
  }

  return result;
};
