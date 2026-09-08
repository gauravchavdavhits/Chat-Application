import nodemailer from 'nodemailer';
import { config } from '../config';

const getTransporter = () => {
  const user = (process.env.EMAIL_USER || config.email.user || '').trim();
  const pass = (process.env.EMAIL_PASS || config.email.pass || '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for port 465 SSL
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendVerificationOtpEmail = async (toEmail: string, otp: string, username?: string): Promise<boolean> => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #0f172a;
        color: #f8fafc;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 520px;
        margin: 40px auto;
        background: #1e293b;
        border-radius: 16px;
        border: 1px solid #334155;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      }
      .header {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        padding: 32px 24px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        color: #ffffff;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .content {
        padding: 32px 28px;
        text-align: center;
      }
      .content p {
        font-size: 15px;
        line-height: 1.6;
        color: #cbd5e1;
        margin: 0 0 20px 0;
      }
      .otp-box {
        display: inline-block;
        background: #0f172a;
        border: 2px solid #6366f1;
        border-radius: 12px;
        padding: 16px 36px;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 8px;
        color: #818cf8;
        margin: 10px 0 24px 0;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      }
      .footer {
        padding: 20px;
        text-align: center;
        background: #0f172a;
        border-top: 1px solid #334155;
        font-size: 12px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>💬 Bidirectional Real-Time Chat</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${username || 'there'}</strong>,</p>
        <p>You requested to verify your email address. Use the following 6-digit One-Time Password (OTP) to complete your verification:</p>
        <div class="otp-box">${otp}</div>
        <p style="font-size: 13px; color: #94a3b8;">This code is valid for <strong>10 minutes</strong>. If you did not request this verification, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Bidirectional Chat Bot. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: config.email.from || config.email.user,
      to: toEmail,
      subject: `Your Verification Code: ${otp} - Bidirectional Chat`,
      text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });
    console.log(`[EmailService] OTP email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${toEmail}:`, error);
    throw error;
  }
};
