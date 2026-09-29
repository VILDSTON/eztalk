import nodemailer from 'nodemailer';

/**
 * EzTalk Email Delivery Service
 * Supports standard SMTP (Gmail, Brevo, Mailgun, Amazon SES, or custom SMTP).
 * Falls back to terminal logging in development if SMTP is not configured.
 */

let transporter = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!host || !user || !pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
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
  const mailer = getTransporter();
  const cleanEmail = (toEmail || '').trim().toLowerCase();

  if (!mailer) {
    console.log('\n' + '='.repeat(62));
    console.log('⚡ [EzTalk Security] EMAIL VERIFICATION CODE (DEV SIMULATION)');
    console.log(`   Recipient : ${cleanEmail}`);
    console.log(`   OTP Code  : >>> ${code} <<<`);
    console.log('   Expires In: 10 minutes');
    console.log('   Note      : Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    console.log('               to send real outgoing emails via SMTP.');
    console.log('='.repeat(62) + '\n');

    return {
      success: true,
      simulated: true,
      code: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  const fromAddress = process.env.SMTP_FROM || `"EzTalk Security" <${process.env.SMTP_USER}>`;

  const mailOptions = {
    from: fromAddress,
    to: cleanEmail,
    subject: `${code} is your EzTalk verification code`,
    text: `Your EzTalk verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this, please ignore this email.`,
    html: createVerificationEmailHtml(code),
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EzTalk Email] Verification code sent to ${cleanEmail}: ${info.messageId}`);
    return { success: true, simulated: false };
  } catch (err) {
    console.error(`[EzTalk Email] Failed to send email to ${cleanEmail}:`, err.message);
    // In dev, don't let broken SMTP completely block user testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EzTalk Email] Dev Fallback Code: >>> ${code} <<<`);
      return { success: true, simulated: true, code };
    }
    throw new Error('Failed to send verification email. Please check the email address or try again later.');
  }
}
