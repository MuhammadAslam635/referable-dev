import { Resend } from 'resend';

// Initialize Resend client only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email using Resend
 * @param options - Email options
 * @returns Promise with email result
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: options.from || 'Referable <noreply@referable.live>',
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        'X-Mailer': 'Referable',
        'X-Priority': '3',
        'List-Unsubscribe': '<mailto:unsubscribe@referable.live>',
      },
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset email
 * @param email - User's email address
 * @param resetLink - Password reset link
 * @param businessName - Name of the business
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request - Referable</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; }
        .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; background: #f8fafc; border-radius: 0 0 8px 8px; }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: #2563eb; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 25px 0;
          font-weight: 600;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your ${businessName} account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you have any issues, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2025 Referable. All rights reserved.</p>
          <p>This email was sent from an automated system, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hello,

We received a request to reset the password for your ${businessName} account.

Click the link below to reset your password:
${resetLink}

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

This link will expire in 1 hour for security reasons.

If you have any issues, please contact our support team.

---
© 2025 Referable. All rights reserved.
This email was sent from an automated system, please do not reply.
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - Referable',
    html,
    text,
  });
}

/**
 * Send welcome email to new business
 * @param email - User's email address
 * @param businessName - Name of the business
 */
export async function sendWelcomeEmail(
  email: string,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Referable</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; }
        .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; background: #f8fafc; border-radius: 0 0 8px 8px; }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: #2563eb; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 600; 
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Referable!</h1>
        </div>
        <div class="content">
          <p>Hello ${businessName},</p>
          <p>Welcome to Referable! We're excited to help you automate your referral program and grow your business through customer communication.</p>
          <p>Here's what you can do with Referable:</p>
          <ul>
            <li>Send automated thank-you messages to customers</li>
            <li>Track referrals and manage customer relationships</li>
            <li>Set up two-way SMS communication with clients</li>
            <li>Import your existing customer data</li>
            <li>Monitor insights and analytics</li>
          </ul>
          <p>Ready to get started? Log in to your dashboard and complete your setup:</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://referable.live'}/login" class="button">Get Started</a>
          </div>
          <p>If you have any questions, our support team is here to help!</p>
        </div>
        <div class="footer">
          <p>© 2025 Referable. All rights reserved.</p>
          <p>This email was sent from an automated system, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Welcome to Referable - Your Referral Automation Platform',
    html,
  });
}

/**
 * Send email to a lead from business
 * @param leadEmail - Lead's email address
 * @param subject - Email subject
 * @param message - Email message
 * @param business - Business information
 */
export async function sendLeadEmail(
  leadEmail: string,
  subject: string,
  message: string,
  business: any
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; background: #f8fafc; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${business.name}</h2>
        </div>
        <div class="content">
          ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
        </div>
        <div class="footer">
          <p>This email was sent from ${business.name} via Referable.</p>
          <p>© 2025 Referable. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${message}

---
This email was sent from ${business.name} via Referable.
© 2025 Referable. All rights reserved.
  `;

  return await sendEmail({
    to: leadEmail,
    subject: subject,
    html,
    text,
    from: `${business.name} <noreply@referable.live>`,
  });
}