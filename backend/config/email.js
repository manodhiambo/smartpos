const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Create email transporter based on service
 */
const createTransporter = () => {
  const service = process.env.EMAIL_SERVICE || 'brevo';
  
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  return nodemailer.createTransporter(config);
};

const transporter = createTransporter();

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise} Send result
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new tenant
 */
const sendWelcomeEmail = async (email, businessName, username, password) => {
  const subject = 'Welcome to SmartPOS!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .credentials { background: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 Welcome to SmartPOS!</h1>
        </div>
        <div class="content">
          <h2>Hello ${businessName}!</h2>
          <p>Your SmartPOS account has been successfully created. You can now manage your supermarket with our powerful POS system.</p>
          
          <div class="credentials">
            <h3>Your Login Credentials:</h3>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Login URL:</strong> ${process.env.FRONTEND_URL}/login</p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after first login for security.</p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to SmartPOS</a>
          </p>
          
          <h3>Getting Started:</h3>
          <ul>
            <li>✅ Set up your products and inventory</li>
            <li>✅ Configure M-Pesa payment details</li>
            <li>✅ Add your staff members</li>
            <li>✅ Start making sales!</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 SmartPOS. All rights reserved.</p>
          <p>Need help? Contact us at support@smartpos.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: email, subject, html, text: `Welcome to SmartPOS! Your credentials - Username: ${username}, Password: ${password}` });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, businessName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request - SmartPOS';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${businessName}!</h2>
          <p>We received a request to reset your SmartPOS password.</p>
          <p>Click the button below to reset your password:</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          
          <p><strong>Note:</strong> This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 SmartPOS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: email, subject, html, text: `Reset your password: ${resetUrl}` });
};

/**
 * Test email configuration
 */
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection
};
