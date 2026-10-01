import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

/**
 * EzTalk Email Delivery Service
 * Supports standard SMTP (Gmail, Brevo, Mailgun, Amazon SES, or custom SMTP).
 * Falls back to terminal logging in development if SMTP is not configured.
 */

let cachedTransporter = null;
let cachedConfigKey = '';

function getTransporter() {
  // Dynamically load fresh .env values in case .env was edited
  dotenv.config();

  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, ''); // automatically strip spaces from 16-char Google App Passwords
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!host || !user || !pass) {
    return null;
  }

  const configKey = `${host}:${port}:${user}:${pass}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  const isGmail = host.toLowerCase().includes('gmail.com') || user.toLowerCase().endsWith('@gmail.com');
  const effectiveHost = host || (isGmail ? 'smtp.gmail.com' : 'localhost');
  const effectivePort = port || 587;
  const isSecure = effectivePort === 465;

  const transportOptions = {
    host: effectiveHost,
    port: effectivePort,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      rejectUnauthorized: false,
    },
  };

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedConfigKey = configKey;
  return cachedTransporter;
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Generates modern dark-themed EzTalk verification email HTML
 */
function createVerificationEmailHtml(code) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EzTalk Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0c0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0c0e; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #131418; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: inline-block; width: 48px; height: 48px; border-radius: 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); text-align: center; line-height: 48px; font-size: 24px;">
                ⚡
              </div>
              <h1 style="margin: 16px 0 4px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">EzTalk Messenger</h1>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">Confirm Your Email Address</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
                Welcome to EzTalk! Use the one-time security code below to verify your email and finish setting up your account:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #1a1c22; border: 1.5px solid #10b981; border-radius: 16px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #10b981; margin-right: -10px;">${code}</span>
              </div>

              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                ⏱ This code expires in <strong style="color: #ffffff;">10 minutes</strong>.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                If you did not request this registration, please disregard this email. Never share this code with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0e0f12; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                EzTalk • Fast, Secure & Light Web Messenger
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Sends a 6-digit verification code to the recipient email.
 * If SMTP is not set up, gracefully outputs to console for development.
 */
export async function sendVerificationEmail(toEmail, code) {
  dotenv.config();
  const cleanEmail = (toEmail || '').trim().toLowerCase();

  // 1. Resend HTTP API (Recommended for cloud hosts like Render Free tier which block SMTP ports 25/465/587)
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      const fromAddress = process.env.RESEND_FROM || 'EzTalk Security <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [cleanEmail],
          subject: `${code} is your EzTalk verification code`,
          html: createVerificationEmailHtml(code),
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[EzTalk Email] Verification code sent via Resend API to ${cleanEmail}: ${resData?.id}`);
        return { success: true, simulated: false };
      } else {
        console.warn(`[EzTalk Email] Resend API error:`, resData);
      }
    } catch (resendErr) {
      console.error(`[EzTalk Email] Resend API exception:`, resendErr?.message);
    }
  }

  // 2. Fallback to dev simulation if SMTP is not configured or SHOW_VERIFICATION_CODE is enabled
  const mailer = getTransporter();
  const allowCodeDisplay = process.env.SHOW_VERIFICATION_CODE === 'true' || process.env.NODE_ENV !== 'production';

  if (!mailer) {
    console.log('\n' + '='.repeat(62));
    console.log('⚡ [EzTalk Security] EMAIL VERIFICATION CODE (SIMULATION)');
    console.log(`   Recipient : ${cleanEmail}`);
    console.log(`   OTP Code  : >>> ${code} <<<`);
    console.log('   Expires In: 10 minutes');
    console.log('='.repeat(62) + '\n');

    return {
      success: true,
      simulated: true,
      code: allowCodeDisplay ? code : undefined,
    };
  }

  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  const user = (process.env.SMTP_USER || '').trim();
  const isGmail = host.includes('gmail.com') || user.endsWith('@gmail.com');

  // For Gmail SMTP, the From address MUST match the authenticated user, or Google rejects/marks as spam
  let fromAddress = process.env.SMTP_FROM || `"EzTalk Security" <${user}>`;
  if (isGmail && !fromAddress.includes(user)) {
    fromAddress = `"EzTalk Security" <${user}>`;
  }

  const mailOptions = {
    from: fromAddress,
    to: cleanEmail,
    subject: `${code} is your EzTalk verification code`,
    text: `Your EzTalk verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this, please ignore this email.`,
    html: createVerificationEmailHtml(code),
  };

  try {
    const sendWithTimeout = Promise.race([
      mailer.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timed out after 5s')), 5000)
      ),
    ]);
    const info = await sendWithTimeout;
    console.log(`[EzTalk Email] Verification code sent to ${cleanEmail}: ${info.messageId}`);
    return { success: true, simulated: false };
  } catch (err) {
    console.error(`[EzTalk Email] Failed to send email to ${cleanEmail}:`, err.message);

    // Always log the code to server terminal/Render logs for debugging & instant recovery
    console.log('\n' + '='.repeat(64));
    console.log(`⚡ [EzTalk Security] OTP Code for ${cleanEmail}: >>> ${code} <<<`);
    console.log('='.repeat(64) + '\n');

    if (err.message && (err.message.includes('535') || err.message.includes('BadCredentials'))) {
      console.warn('\n' + '!'.repeat(70));
      console.warn('⚠️ [EzTalk Email] GMAIL SMTP AUTHENTICATION FAILED (535 BadCredentials)');
      console.warn('   Google DOES NOT accept regular account passwords for SMTP!');
      console.warn('   You MUST generate and use a 16-character Google App Password:');
      console.warn(`   1. Turn on 2-Step Verification for ${user}`);
      console.warn('   2. Visit: https://myaccount.google.com/apppasswords');
      console.warn('   3. Create an app password named "EzTalk"');
      console.warn('   4. Put that 16-character code into SMTP_PASS in .env or Render Dashboard');
      console.warn('!'.repeat(70) + '\n');
      throw new Error('Gmail SMTP authentication failed (535 BadCredentials). Please ensure valid Google App Password is set in server environment variables.');
    }

    if (err.message && err.message.includes('timed out')) {
      console.warn('⚠️ [EzTalk Email] SMTP CONNECTION TIMED OUT');
      console.warn('   Render.com Free tier blocks outbound SMTP ports (25, 465, 587).');
      console.warn('   To fix on Render: add RESEND_API_KEY in Render Environment Variables,');
      console.warn('   or set SHOW_VERIFICATION_CODE=true to auto-fill the code.');

      // If user enabled SHOW_VERIFICATION_CODE or in dev, provide code so the user is never stuck
      if (allowCodeDisplay) {
        return {
          success: true,
          simulated: true,
          code,
          warning: 'Render Free tier blocks SMTP ports 587/465. Code provided via instant fallback.',
        };
      }

      throw new Error('Email server timed out. Render Free tier blocks SMTP ports 587/465. Use RESEND_API_KEY (free HTTPS API) or set SHOW_VERIFICATION_CODE=true in Render.');
    }

    // In dev, don't let broken SMTP completely block user testing
    if (allowCodeDisplay) {
      console.log(`[EzTalk Email] Fallback Code: >>> ${code} <<<`);
      return {
        success: true,
        simulated: true,
        code,
        warning: err.message.includes('535') ? 'Gmail App Password required (see server terminal)' : err.message,
      };
    }
    throw new Error(err.message || 'Failed to send verification email. Please check the email address or try again later.');
  }
}
