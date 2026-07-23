import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import dns from "node:dns";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  replyTo?: string;
}

const getLogoPath = (): string => {
  if (process.env.LOGO_PATH) {
    return process.env.LOGO_PATH;
  }

  const cwdPath = path.join(process.cwd(), "public", "image.png");
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const relativePath = path.join(__dirname, "..", "..", "public", "image.png");
    if (fs.existsSync(relativePath)) {
      return relativePath;
    }
  } catch (error) {
    console.error("Error resolving logo path relative to file:", error);
  }

  return cwdPath;
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  return { host, user, pass, port, secure };
};

const buildTransport = (port: number, secure: boolean) => {
  const { host, user, pass } = getSmtpConfig();

  const options: SMTPTransport.Options = {
    host: host || "",
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: user || "",
      pass: pass || "",
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
      minVersion: "TLSv1.2",
      servername: host,
    },
  };

  return nodemailer.createTransport(options);
};

const getTransporterCandidates = () => {
  const { port, secure } = getSmtpConfig();
  const candidates: Array<{ port: number; secure: boolean }> = [{ port, secure }];

  if (port === 465) {
    candidates.push({ port: 587, secure: false });
  } else if (port === 587) {
    candidates.push({ port: 465, secure: true });
  }

  return candidates;
};

export const emailService = {
  sendMail: async (options: MailOptions): Promise<boolean> => {
    const { host, user, pass } = getSmtpConfig();
    if (!host || !user || !pass) {
      console.error("Failed to send email: SMTP is not configured");
      return false;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "ORGA HRMS"}" <${process.env.EMAIL_FROM || "noreply@orga.cc"}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    };

    const candidates = getTransporterCandidates();
    let lastError: unknown;

    for (const candidate of candidates) {
      try {
        const transporter = buildTransport(candidate.port, candidate.secure);
        const info = await transporter.sendMail(mailOptions);
        console.log(
          `Email sent successfully via ${host}:${candidate.port}:`,
          info.messageId,
        );
        return true;
      } catch (error) {
        lastError = error;
        console.error(
          `Failed to send email via ${host}:${candidate.port}:`,
          error,
        );
      }
    }

    console.error("Failed to send email after trying all SMTP ports:", lastError);
    return false;
  },

  sendOtpEmail: async (email: string, name: string, otp: string): Promise<boolean> => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ORGA OTP Verification Code</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .header img {
      height: 44px;
      width: auto;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
      text-align: center;
    }
    .content p {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 24px;
      text-align: center;
    }
    .otp-container {
      background-color: #f3f4f6;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
      border: 1px dashed #c084fc;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4f46e5;
      margin: 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
    .security-notice {
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="cid:orgalogo" alt="ORGA Logo" />
        <h1>ORGA HRMS</h1>
      </div>
      <div class="content">
        <h2>Verify Your Email</h2>
        <p>Hello ${name},</p>
        <p>Thank you for choosing ORGA HRMS. Please use the following 6-digit One-Time Password (OTP) to complete your registration. This code is valid for 15 minutes.</p>
        
        <div class="otp-container">
          <p class="otp-code">${otp}</p>
        </div>

        <p class="security-notice">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
      <div class="footer">
        <p>&copy; 2025 ORGA HRMS. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return emailService.sendMail({
      to: email,
      subject: `Your ORGA Verification Code: ${otp}`,
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendWelcomeEmail: async (email: string, name: string): Promise<boolean> => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ORGA HRMS</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 550px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .header img {
      height: 44px;
      width: auto;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .features-list {
      margin: 25px 0;
      padding-left: 0;
      list-style: none;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 15px;
      margin-top: 2px;
    }
    .feature-text strong {
      color: #1f2937;
      font-size: 15px;
    }
    .feature-text p {
      margin: 4px 0 0 0;
      font-size: 13.5px;
      color: #6b7280;
      text-align: left;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0 15px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="cid:orgalogo" alt="ORGA Logo" />
        <h1>Welcome to ORGA</h1>
      </div>
      <div class="content">
        <h2>Your account is active!</h2>
        <p>Hello ${name},</p>
        <p>Welcome to ORGA HRMS. Your email has been verified, and your workspace is fully activated. We're excited to help you streamline your operations, manage your teams, and optimize workflows.</p>
        
        <p>Here are a few key features to explore on the platform:</p>
        
        <ul class="features-list">
          <li class="feature-item">
            <span class="feature-icon">👤</span>
            <div class="feature-text">
              <strong>Interactive Employee Directory</strong>
              <p>Easily manage member profiles, contact directories, and roles within your company.</p>
            </div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">📅</span>
            <div class="feature-text">
              <strong>Attendance & Leave Management</strong>
              <p>Track working shifts, log attendance check-ins, and streamline vacation requests.</p>
            </div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">📊</span>
            <div class="feature-text">
              <strong>Financial & Payroll Reporting</strong>
              <p>Generate salary slips, verify balance sheets, and review budget actuals instantly.</p>
            </div>
          </li>
        </ul>

        <div class="cta-container">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?mode=login" class="cta-button">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2025 ORGA HRMS. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return emailService.sendMail({
      to: email,
      subject: "Welcome to ORGA HRMS — Let's get started!",
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendEmployeeCredentialsEmail: async (email: string, name: string, password: string): Promise<boolean> => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ORGA HRMS Account Credentials</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 550px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .header img {
      height: 44px;
      width: auto;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .credentials-container {
      background-color: #f3f4f6;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      border: 1px solid #e5e7eb;
    }
    .credential-row {
      margin-bottom: 10px;
      font-size: 15px;
    }
    .credential-row:last-child {
      margin-bottom: 0;
    }
    .credential-label {
      font-weight: bold;
      color: #4b5563;
    }
    .credential-value {
      font-family: monospace;
      color: #1f2937;
      background-color: #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0 15px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="cid:orgalogo" alt="ORGA Logo" />
        <h1>Welcome to ORGA</h1>
      </div>
      <div class="content">
        <h2>Your account has been created!</h2>
        <p>Hello ${name},</p>
        <p>Welcome to ORGA HRMS. Your administrator has created an account for you. You can now log in using the credentials below:</p>
        
        <div class="credentials-container">
          <div class="credential-row">
            <span class="credential-label">Email:</span>
            <span class="credential-value">${email}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Temporary Password:</span>
            <span class="credential-value">${password}</span>
          </div>
        </div>

        <p>For security, please change your password after logging in for the first time.</p>
        
        <div class="cta-container">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?mode=login" class="cta-button">Login to Your Account</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2025 ORGA HRMS. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return emailService.sendMail({
      to: email,
      subject: "Your ORGA HRMS Employee Account Credentials",
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendInterviewScheduledEmail: async (options: {
    email: string;
    candidateName: string;
    jobTitle: string;
    scheduledAt: Date;
    interviewType: string;
    interviewMode: string;
    panel: string;
  }): Promise<boolean> => {
    const {
      email,
      candidateName,
      jobTitle,
      scheduledAt,
      interviewType,
      interviewMode,
      panel,
    } = options;

    const formattedDate = scheduledAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = scheduledAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const panelLabel = panel === "Tech" ? "Tech Panel" : "HR Panel";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Scheduled</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 550px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content p {
      font-size: 15px;
      color: #4b5563;
      margin: 0 0 16px;
    }
    .details {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      font-size: 14px;
      color: #374151;
      margin-bottom: 10px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      font-weight: 600;
      color: #111827;
    }
    .note {
      font-size: 14px;
      color: #7c3aed;
      font-weight: 600;
    }
    .footer {
      padding: 0 30px 30px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Interview Scheduled</h1>
      </div>
      <div class="content">
        <p>Dear ${candidateName},</p>
        <p>
          We are pleased to inform you that your interview for the
          <strong>${jobTitle}</strong> position has been scheduled.
          Please find the details below:
        </p>
        <div class="details">
          <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formattedDate}</span></div>
          <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formattedTime}</span></div>
          <div class="detail-row"><span class="detail-label">Interview Type:</span> <span class="detail-value">${interviewType}</span></div>
          <div class="detail-row"><span class="detail-label">Interview Panel:</span> <span class="detail-value">${panelLabel}</span></div>
          <div class="detail-row"><span class="detail-label">Mode:</span> <span class="detail-value">${interviewMode}</span></div>
          <div class="detail-row"><span class="detail-label">Meeting Link:</span> <span class="detail-value">The meet link will be shared soon.</span></div>
          <div class="detail-row"><span class="detail-label">Instructions:</span> <span class="detail-value">Please be on time.</span></div>
        </div>
        <p class="note">The meet link will be shared soon.</p>
        <p>We look forward to speaking with you.</p>
        <p>Best regards,<br/>ORGA HRMS Recruitment Team</p>
      </div>
      <div class="footer">
        This is an automated message from ORGA HRMS. Please do not reply to this email.
      </div>
    </div>
  </div>
</body>
</html>`;

    return emailService.sendMail({
      to: email,
      subject: `Interview Scheduled - ${jobTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendOfferLetterEmail: async (options: {
    email: string;
    candidateName: string;
    jobTitle: string;
    salary: string;
    joiningDate: Date | null;
    department: string;
    designation: string;
    notes: string;
    acceptUrl: string;
    documentUploadUrl?: string;
  }): Promise<boolean> => {
    const {
      email,
      candidateName,
      jobTitle,
      salary,
      joiningDate,
      department,
      designation,
      notes,
      acceptUrl,
      documentUploadUrl,
    } = options;

    const formattedJoiningDate = joiningDate
      ? joiningDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "To be confirmed";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Offer Letter</title></head>
<body style="font-family: Arial, sans-serif; background:#f4f6f9; margin:0; padding:32px 0;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5); padding:28px 24px; color:#fff;">
      <h1 style="margin:0; font-size:22px;">Offer Letter</h1>
    </div>
    <div style="padding:28px 24px; color:#374151; line-height:1.6;">
      <p>Dear ${candidateName},</p>
      <p>Congratulations! We are pleased to offer you the position of <strong>${designation}</strong> for <strong>${jobTitle}</strong> at ORGA.</p>
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:18px; margin:20px 0;">
        <p style="margin:0 0 10px;"><strong>Department:</strong> ${department}</p>
        <p style="margin:0 0 10px;"><strong>Salary / CTC:</strong> ${salary}</p>
        <p style="margin:0 0 10px;"><strong>Joining Date:</strong> ${formattedJoiningDate}</p>
        ${notes ? `<p style="margin:0;"><strong>Additional Notes:</strong> ${notes}</p>` : ""}
      </div>
      <p>Please review the offer details below and confirm your acceptance using the button.</p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${acceptUrl}" style="display:inline-block; background:#7D1EDB; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px; padding:14px 28px; border-radius:999px;">
          Accept Offer Letter
        </a>
      </div>
      <p style="font-size:13px; color:#6b7280;">If the button does not work, copy and paste this link into your browser:<br/><a href="${acceptUrl}" style="color:#7D1EDB; word-break:break-all;">${acceptUrl}</a></p>
      ${documentUploadUrl ? `<p style="margin-top:18px;">Please also upload your onboarding documents using this secure link:<br/><a href="${documentUploadUrl}" style="color:#7D1EDB; word-break:break-all;">${documentUploadUrl}</a></p>` : ""}
      <p>We look forward to welcoming you aboard.</p>
      <p>Best regards,<br/>ORGA HRMS Recruitment Team</p>
    </div>
  </div>
</body>
</html>`;

    return emailService.sendMail({
      to: email,
      subject: `Offer Letter - ${jobTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendCandidateDocumentUploadEmail: async (options: {
    email: string;
    candidateName: string;
    jobTitle: string;
    uploadUrl: string;
    reason: "selected" | "offer_accepted" | "reminder";
  }): Promise<boolean> => {
    const { email, candidateName, jobTitle, uploadUrl, reason } = options;
    const intro =
      reason === "selected"
        ? "Congratulations on being selected in the interview process."
        : reason === "offer_accepted"
          ? "Thank you for accepting our offer."
          : "This is a reminder to complete your onboarding documents.";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Upload Documents</title></head>
<body style="font-family: Arial, sans-serif; background:#f4f6f9; margin:0; padding:32px 0;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5); padding:28px 24px; color:#fff;">
      <h1 style="margin:0; font-size:22px;">Upload Onboarding Documents</h1>
    </div>
    <div style="padding:28px 24px; color:#374151; line-height:1.6;">
      <p>Dear ${candidateName},</p>
      <p>${intro} Please upload your required documents and details for the <strong>${jobTitle}</strong> role.</p>
      <ul style="padding-left:18px;">
        <li>ID proof (Aadhaar / PAN / Passport)</li>
        <li>Address proof</li>
        <li>Recent photograph</li>
        <li>Education certificate (if applicable)</li>
        <li>Bank proof (if applicable)</li>
        <li>Personal and emergency contact details</li>
      </ul>
      <div style="text-align:center; margin:28px 0;">
        <a href="${uploadUrl}" style="display:inline-block; background:#7D1EDB; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px; padding:14px 28px; border-radius:999px;">
          Upload Documents
        </a>
      </div>
      <p style="font-size:13px; color:#6b7280;">If the button does not work, copy and paste this link into your browser:<br/><a href="${uploadUrl}" style="color:#7D1EDB; word-break:break-all;">${uploadUrl}</a></p>
      <p>Best regards,<br/>ORGA HRMS Recruitment Team</p>
    </div>
  </div>
</body>
</html>`;

    return emailService.sendMail({
      to: email,
      subject: `Upload your documents - ${jobTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },

  sendDemoRequestEmail: async (payload: {
    name: string;
    email: string;
    contact: string;
    preferredLanguage: string;
    teamSize: string;
    useCase: string;
  }): Promise<boolean> => {
    const recipient = (process.env.DEMO_REQUEST_EMAIL || "info@suhtech.top").trim();
    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const safe = {
      name: escapeHtml(payload.name),
      email: escapeHtml(payload.email),
      contact: escapeHtml(payload.contact),
      preferredLanguage: escapeHtml(payload.preferredLanguage),
      teamSize: escapeHtml(payload.teamSize),
      useCase: escapeHtml(payload.useCase),
    };
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New ORGA Demo Request</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f4f6f9; margin:0; padding:24px; color:#1f2937;">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(15,23,42,0.08);">
    <div style="background:linear-gradient(135deg,#756FCC,#C65CF4); padding:24px 28px; color:#ffffff;">
      <h1 style="margin:0; font-size:24px;">New Demo Request</h1>
      <p style="margin:8px 0 0; font-size:14px; opacity:0.95;">Submitted from the ORGA marketing site</p>
    </div>
    <div style="padding:28px;">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:10px 0; font-size:12px; text-transform:uppercase; color:#6b7280; width:180px;">Name</td><td style="padding:10px 0; font-size:15px; font-weight:600;">${safe.name}</td></tr>
        <tr><td style="padding:10px 0; font-size:12px; text-transform:uppercase; color:#6b7280;">Email</td><td style="padding:10px 0; font-size:15px;"><a href="mailto:${safe.email}" style="color:#756FCC;">${safe.email}</a></td></tr>
        <tr><td style="padding:10px 0; font-size:12px; text-transform:uppercase; color:#6b7280;">Contact</td><td style="padding:10px 0; font-size:15px;">${safe.contact}</td></tr>
        <tr><td style="padding:10px 0; font-size:12px; text-transform:uppercase; color:#6b7280;">Preferred language</td><td style="padding:10px 0; font-size:15px;">${safe.preferredLanguage}</td></tr>
        <tr><td style="padding:10px 0; font-size:12px; text-transform:uppercase; color:#6b7280;">Team size</td><td style="padding:10px 0; font-size:15px;">${safe.teamSize}</td></tr>
      </table>
      <div style="margin-top:20px; padding:16px; border-radius:12px; background:#f8fafc; border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#6b7280;">Use case</p>
        <p style="margin:0; font-size:15px; line-height:1.6; white-space:pre-wrap;">${safe.useCase}</p>
      </div>
      <p style="margin:24px 0 0; font-size:12px; color:#6b7280;">Submitted at ${submittedAt} IST</p>
    </div>
  </div>
</body>
</html>`;

    return emailService.sendMail({
      to: recipient,
      subject: `Demo request from ${payload.name}`,
      html: htmlContent,
      replyTo: payload.email,
      attachments: [
        {
          filename: "logo.png",
          path: getLogoPath(),
          cid: "orgalogo",
        },
      ],
    });
  },
};
