const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Create email transporter
 */
const createTransporter = () => {
  // For development, use a test account or console
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
    console.log('📧 Email service running in development mode (emails logged to console)');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Library System'}" <${process.env.FROM_EMAIL || 'noreply@library.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    // In development, log to console
    if (!transporter) {
      console.log('='.repeat(50));
      console.log('📧 EMAIL (Development Mode)');
      console.log('='.repeat(50));
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', html.substring(0, 200) + '...');
      console.log('='.repeat(50));
      return { success: true, mode: 'development' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw error in production to prevent breaking the flow
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: error.message };
    }
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetLink) => {
  return await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1976d2; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Library Management System</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #1976d2; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="color: #666;">This link will expire in 15 minutes.</p>
          <p style="color: #666;">If you didn't request this password reset, please ignore this email.</p>
        </div>
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated email. Please do not reply.
          </p>
        </div>
      </div>
    `,
  });
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, name, otp) => {
  return await sendEmail({
    to: email,
    subject: 'Your OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1976d2; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Library Management System</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9; text-align: center;">
          <h2>Your One-Time Password</h2>
          <p>Hello ${name},</p>
          <p>Use the following code to complete your action:</p>
          <div style="background-color: white; 
                      padding: 20px; 
                      margin: 30px auto; 
                      max-width: 200px; 
                      border: 2px dashed #1976d2; 
                      border-radius: 10px;">
            <span style="font-size: 32px; 
                         font-weight: bold; 
                         color: #1976d2; 
                         letter-spacing: 10px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666;">This code will expire in 5 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
};