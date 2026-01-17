const nodemailer = require('nodemailer');

const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };

  // Check if email credentials are configured
  if (!config.auth.user || !config.auth.pass) {
    console.log('⚠️  Email not configured - emails will be logged to console');
    return null;
  }

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

/**
 * Send email
 */
const sendEmail = async (to, subject, html) => {
  try {
    if (!transporter) {
      console.log('\n📧 Email (not sent - no config):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('---\n');
      return { success: true, message: 'Email logged (not configured)' };
    }

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'SmartPOS'}" <${process.env.EMAIL_FROM || 'noreply@smartpos.com'}>`,
      to,
      subject,
      html
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new tenant
 */
const sendWelcomeEmail = async (email, businessName, username, password) => {
  const subject = `Welcome to SmartPOS - ${businessName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SmartPOS!</h1>
        </div>
        <div class="content">
          <h2>Hello ${businessName}!</h2>
          <p>Thank you for choosing SmartPOS for your business. Your account has been successfully created.</p>
          
          <div class="credentials">
            <h3>Your Login Credentials:</h3>
            <p><strong>Business Email:</strong> ${email}</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>

          <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to SmartPOS</a>

          <h3>Getting Started:</h3>
          <ol>
            <li>Login with the credentials above</li>
            <li>Add your products to inventory</li>
            <li>Create users for your staff</li>
            <li>Start selling!</li>
          </ol>

          <p>If you need any assistance, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 SmartPOS. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const subject = 'SmartPOS - Password Reset Request';
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
};

/**
 * Test email connection
 */
const testEmailConnection = async () => {
  try {
    if (!transporter) {
      console.log('⚠️  Email service not configured (optional)');
      return false;
    }

    await transporter.verify();
    console.log('✅ Email service connected');
    return true;
  } catch (error) {
    console.log('⚠️  Email service connection failed (optional):', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection
};
