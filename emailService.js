/**
 * Legal Sthal - Automated Email Notification Service (emailService.js)
 * High-delivery transactional emails via Gmail SMTP (Nodemailer)
 */

const nodemailer = require('nodemailer');

const GMAIL_USER = (process.env.GMAIL_USER || 'legalsthal@gmail.com').trim();
const GMAIL_PASS = (process.env.GMAIL_APP_PASS || 'tjhg jpwz vded bubk').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Resolves the live base portal URL.
 * Automatically utilizes Netlify's production URL, custom PORTAL_URL environment variable,
 * or defaults to https://legalsthalservice.netlify.app.
 */
function getPortalBaseUrl() {
  const base = process.env.PORTAL_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://legalsthalservice.netlify.app';
  return base.replace(/\/$/, '');
}

/**
 * Base responsive email template wrapper with Legal Sthal luxury styling
 */
function wrapTemplate(title, preheader, bodyHtml, ctaText = 'Open Legal Sthal Portal', ctaUrl) {
  const finalCtaUrl = ctaUrl || `${getPortalBaseUrl()}/#client/login`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
    .wrapper { width: 100%; background-color: #0b0f19; padding: 40px 10px; }
    .card { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 32px 30px; text-align: center; border-bottom: 2px solid #d4af37; }
    .logo-badge { display: inline-block; padding: 8px 18px; background: rgba(212,175,55,0.12); border: 1px solid #d4af37; border-radius: 24px; color: #f59e0b; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
    .title { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-top: 6px; }
    .content { padding: 36px 32px; font-size: 15px; line-height: 1.65; color: #cbd5e1; }
    .cta-container { text-align: center; margin: 34px 0 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #0b0f19 !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 14px rgba(212,175,55,0.3); }
    .details-box { background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 18px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .details-label { color: #94a3b8; font-size: 13px; }
    .details-val { color: #ffffff; font-weight: 600; font-size: 13px; }
    .footer { background: #090d16; padding: 24px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer a { color: #d4af37; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">Legal Sthal Corporate Portal</div>
        <h1 class="title">${title}</h1>
        <div class="subtitle">${preheader}</div>
      </div>
      <div class="content">
        ${bodyHtml}
        ${ctaText ? `
        <div class="cta-container">
          <a href="${finalCtaUrl}" class="btn" target="_blank">${ctaText} &rarr;</a>
        </div>` : ''}
      </div>
      <div class="footer">
        <p>This is an automated operational notification from Legal Sthal.</p>
        <p>&copy; ${new Date().getFullYear()} Legal Sthal Corporate Services. All rights reserved.</p>
        <p>Need support? Contact your designated SPOC or reply to <a href="mailto:support@legalsthal.com">support@legalsthal.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends generic mail with error containment
 */
async function sendMail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[EmailService] Skipped: No recipient email provided.');
    return { success: false, reason: 'NO_RECIPIENT' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Legal Sthal Corporate" <${GMAIL_USER}>`,
      to,
      subject,
      text: text || subject,
      html
    });
    console.log(`[EmailService] Sent email to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Welcome & Onboarding Email
 */
async function sendWelcomeEmail({ clientEmail, clientName, companyName, clientId, tempPassword, loginUrl }) {
  const targetLoginUrl = loginUrl || `${getPortalBaseUrl()}/#client/login`;
  const title = 'Welcome to Legal Sthal';
  const preheader = 'Your Corporate Client Portal is Ready';
  const body = `
    <p>Dear <strong>${clientName || 'Valued Client'}</strong>,</p>
    <p>Welcome to <strong>Legal Sthal</strong>. Your corporate legal workspace has been provisioned for <strong>${companyName || 'your organization'}</strong>.</p>
    <p>You can now track your incorporations, compliance filings, and document verifications in real time.</p>
    
    <div style="background: rgba(212,175,55,0.08); border-left: 4px solid #d4af37; padding: 16px; border-radius: 4px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #f59e0b; font-weight: 700; font-size: 14px;">YOUR ACCESS CREDENTIALS</p>
      <p style="margin: 4px 0;"><strong>Client ID:</strong> <code style="background: #090d16; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">${clientId}</code></p>
      <p style="margin: 4px 0;"><strong>Registered Email:</strong> ${clientEmail}</p>
      <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #090d16; padding: 2px 6px; border-radius: 4px; color: #e2e8f0;">${tempPassword || 'Welcome@2026'}</code></p>
    </div>

    <p style="font-size: 13px; color: #94a3b8;"><em>For security, you will be prompted to set your personal password upon your initial login.</em></p>
  `;

  return sendMail({
    to: clientEmail,
    subject: `Welcome to Legal Sthal — Corporate Portal Access (${companyName || clientId})`,
    html: wrapTemplate(title, preheader, body, 'Sign In to Portal', targetLoginUrl)
  });
}

/**
 * 2. Service Stage Update Email
 */
async function sendStageUpdateEmail({ clientEmail, clientName, companyName, serviceName, stageName, progressPercentage, remarks, portalUrl }) {
  const targetPortalUrl = portalUrl || `${getPortalBaseUrl()}/#client/services`;
  const title = 'Service Stage Progress';
  const preheader = `${serviceName} has progressed to: ${stageName}`;
  const body = `
    <p>Dear <strong>${clientName || 'Client'}</strong>,</p>
    <p>We are pleased to inform you that your service <strong>${serviceName}</strong> has reached a new operational milestone.</p>
    
    <div style="background: #090d16; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">CURRENT ACTIVE STAGE</p>
      <p style="margin: 6px 0 16px 0; color: #38bdf8; font-size: 20px; font-weight: 700;">${stageName}</p>
      
      <div style="width: 100%; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
        <div style="width: ${progressPercentage || 50}%; height: 100%; background: linear-gradient(90deg, #d4af37, #10b981);"></div>
      </div>
      <p style="margin: 0; text-align: right; font-size: 13px; color: #10b981; font-weight: 600;">Overall Progress: ${progressPercentage || 50}%</p>
    </div>

    ${remarks ? `<p style="font-size: 14px; color: #cbd5e1;"><strong>SPOC Remarks:</strong> ${remarks}</p>` : ''}
    <p>You can view full timeline details, stage logs, and download approved certificates directly on your client portal.</p>
  `;

  return sendMail({
    to: clientEmail,
    subject: `Update: ${serviceName} reached [${stageName}] — Legal Sthal`,
    html: wrapTemplate(title, preheader, body, 'View Progress Tracker', targetPortalUrl)
  });
}

/**
 * 3. Document Status Update Email (Verified / Rejected)
 */
async function sendDocumentStatusEmail({ clientEmail, clientName, companyName, serviceName, documentName, status, rejectionReason, portalUrl }) {
  const targetPortalUrl = portalUrl || `${getPortalBaseUrl()}/#client/documents`;
  const isVerified = status === 'Verified';
  const title = isVerified ? 'Document Verified' : 'Action Required: Document Update Needed';
  const preheader = isVerified ? `Your ${documentName} was verified successfully` : `Please re-upload: ${documentName}`;
  const badgeColor = isVerified ? '#10b981' : '#ef4444';

  const body = `
    <p>Dear <strong>${clientName || 'Client'}</strong>,</p>
    <p>The legal team has completed review of your submitted compliance document for <strong>${companyName || 'your account'}</strong>.</p>
    
    <div style="background: #090d16; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">DOCUMENT</p>
      <p style="margin: 4px 0 12px 0; color: #ffffff; font-size: 17px; font-weight: 700;">${documentName}</p>
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">STATUS</p>
      <p style="margin: 4px 0 0 0; color: ${badgeColor}; font-size: 16px; font-weight: 700;">${status.toUpperCase()}</p>
      ${!isVerified && rejectionReason ? `
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
          <p style="margin: 0 0 4px 0; color: #f87171; font-size: 13px; font-weight: 600;">REJECTION REASON:</p>
          <p style="margin: 0; color: #fca5a5; font-size: 14px;">${rejectionReason}</p>
        </div>
      ` : ''}
    </div>

    ${isVerified ? 
      `<p style="color: #34d399;">Your document has met statutory standards and will now be processed with ministry registries.</p>` : 
      `<p style="color: #fca5a5;">Please click below to access your document workspace and upload a clear, revised copy to avoid filing delays.</p>`
    }
  `;

  return sendMail({
    to: clientEmail,
    subject: `Document ${status}: ${documentName} — Legal Sthal`,
    html: wrapTemplate(title, preheader, body, isVerified ? 'View Documents' : 'Re-Upload Document Now', targetPortalUrl)
  });
}

/**
 * 4. Quote Request Proposal Email
 */
async function sendQuoteProposalEmail({ clientEmail, clientName, serviceName, quoteAmount, remarks, portalUrl }) {
  const targetPortalUrl = portalUrl || `${getPortalBaseUrl()}/#client/quotes`;
  const title = 'Proposal Prepared';
  const preheader = `Formal fee proposal ready for ${serviceName}`;
  const body = `
    <p>Dear <strong>${clientName || 'Client'}</strong>,</p>
    <p>Thank you for submitting an inquiry for <strong>${serviceName}</strong>. Our legal and advisory board has generated your customized engagement proposal.</p>
    
    <div style="background: rgba(212,175,55,0.08); border: 1px solid #d4af37; border-radius: 8px; padding: 22px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; color: #f59e0b; font-size: 13px; font-weight: 700; letter-spacing: 1px;">PROPOSED PROFESSIONAL FEE</p>
      <p style="margin: 8px 0; color: #ffffff; font-size: 32px; font-weight: 800;">₹${Number(quoteAmount || 0).toLocaleString('en-IN')}</p>
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">Includes government filing fees, statutory compliance & SPOC advisory</p>
    </div>

    ${remarks ? `<p style="font-size: 14px; color: #cbd5e1;"><strong>Proposal Details:</strong> ${remarks}</p>` : ''}
    <p>Please review the proposal breakdown on your portal to confirm the service order and begin drafting.</p>
  `;

  return sendMail({
    to: clientEmail,
    subject: `Fee Proposal Ready: ${serviceName} — Legal Sthal`,
    html: wrapTemplate(title, preheader, body, 'Review & Accept Proposal', targetPortalUrl)
  });
}

module.exports = {
  transporter,
  sendMail,
  sendWelcomeEmail,
  sendStageUpdateEmail,
  sendDocumentStatusEmail,
  sendQuoteProposalEmail
};
