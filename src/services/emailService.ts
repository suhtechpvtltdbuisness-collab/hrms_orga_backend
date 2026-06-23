import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("SMTP credentials are not fully configured in environment variables.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const emailService = {
  sendMail: async (options: MailOptions): Promise<boolean> => {
    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'ORGA HRMS'}" <${process.env.EMAIL_FROM || 'noreply@orga.cc'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
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
          path: "/home/aditya-pandey/Desktop/suhtech/ems/public/image.png",
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
          path: "/home/aditya-pandey/Desktop/suhtech/ems/public/image.png",
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
          path: "/home/aditya-pandey/Desktop/suhtech/ems/public/image.png",
          cid: "orgalogo",
        },
      ],
    });
  },
};
