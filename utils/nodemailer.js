const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Create email transporter based on environment
 */
const createTransporter = () => {
  // In development, return null to log emails to console
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Using development email mode (emails logged to console)');
    return null;
  }

  // In production, create real transporter
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('⚠️ SMTP not configured. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

const transporter = createTransporter();

/**
 * Email templates
 */
const templates = {
  welcome: (name) => ({
    subject: 'Welcome to Library Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1976d2, #42a5f5); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📚 Welcome to Our Library!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name}!</h2>
          <p>Your account has been created successfully. You can now:</p>
          <ul>
            <li>Browse our extensive book collection</li>
            <li>Borrow books online</li>
            <li>Track your reading history</li>
            <li>Write reviews and ratings</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/books" 
               style="background: #1976d2; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-size: 16px;">
              Start Browsing Books
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `,
  }),

  passwordReset: (name, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f57c00, #ff9800); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #f57c00; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-size: 16px;">
              Reset My Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes for security reasons.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this password reset, please ignore this email.
          </p>
        </div>
      </div>
    `,
  }),

  otp: (name, otp) => ({
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #388e3c, #4caf50); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔢 Verification Code</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; text-align: center; border-radius: 0 0 10px 10px;">
          <p>Hello ${name},</p>
          <p>Use the following code to complete your verification:</p>
          <div style="background: white; padding: 20px; margin: 30px auto; max-width: 200px; 
                      border: 2px dashed #388e3c; border-radius: 10px;">
            <span style="font-size: 36px; font-weight: bold; color: #388e3c; letter-spacing: 10px;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 5 minutes. Do not share it with anyone.
          </p>
        </div>
      </div>
    `,
  }),

  overdueReminder: (name, bookTitle, dueDate) => ({
    subject: 'Overdue Book Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #d32f2f, #f44336); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Overdue Book Notice</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <h2>Dear ${name},</h2>
          <p>This is a reminder that the following book is overdue:</p>
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #d32f2f;">
            <h3 style="margin: 0; color: #333;">${bookTitle}</h3>
            <p style="margin: 10px 0 0 0; color: #666;">
              Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong>
            </p>
          </div>
          <p>Please return the book as soon as possible to avoid additional fines.</p>
          <p style="color: #d32f2f;">Late fee: $1.00 per day</p>
        </div>
      </div>
    `,
  }),

  bookingConfirmation: (name, bookTitle, dueDate) => ({
    subject: 'Book Borrowed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1976d2, #2196f3); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📖 Book Borrowed!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <h2>Thank you, ${name}!</h2>
          <p>You have successfully borrowed:</p>
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1976d2;">
            <h3 style="margin: 0; color: #333;">${bookTitle}</h3>
            <p style="margin: 10px 0 0 0; color: #666;">
              Due Date: <strong>${new Date(dueDate).toLocaleDateString()}</strong>
            </p>
          </div>
          <p style="color: #666; font-size: 14px;">
            📌 Please return the book by the due date to avoid late fees.
          </p>
          <p style="color: #666; font-size: 14px;">
            💡 You can check your borrowed books anytime in your account dashboard.
          </p>
        </div>
      </div>
    `,
  }),
};

/**
 * Send email using configured transporter
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body
 * @returns {Promise<Object>} - Send result
 */
const sendMail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Library System'}" <${process.env.FROM_EMAIL || 'noreply@library.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    // In development, log to console
    if (!transporter || process.env.NODE_ENV === 'development') {
      console.log('='.repeat(60));
      console.log('📧 EMAIL (Development Mode)');
      console.log('='.repeat(60));
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body Preview:', html.substring(0, 200).replace(/\n/g, ' ') + '...');
      console.log('='.repeat(60));
      return { 
        success: true, 
        mode: 'development',
        messageId: `dev_${Date.now()}`,
      };
    }

    // Send real email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { 
      success: true, 
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Don't throw in production to prevent breaking the app
    if (process.env.NODE_ENV === 'production') {
      return { 
        success: false, 
        error: error.message,
      };
    }
    throw error;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, name) => {
  const template = templates.welcome(name);
  return sendMail({ to: email, ...template });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetLink) => {
  const template = templates.passwordReset(name, resetLink);
  return sendMail({ to: email, ...template });
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, name, otp) => {
  const template = templates.otp(name, otp);
  return sendMail({ to: email, ...template });
};

/**
 * Send overdue reminder
 */
const sendOverdueReminder = async (email, name, bookTitle, dueDate) => {
  const template = templates.overdueReminder(name, bookTitle, dueDate);
  return sendMail({ to: email, ...template });
};

/**
 * Send booking confirmation
 */
const sendBookingConfirmation = async (email, name, bookTitle, dueDate) => {
  const template = templates.bookingConfirmation(name, bookTitle, dueDate);
  return sendMail({ to: email, ...template });
};

/**
 * Send bulk notification
 */
const sendBulkNotification = async (recipients, templateName, templateData) => {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      let emailOptions;
      
      switch (templateName) {
        case 'overdueReminder':
          emailOptions = templates.overdueReminder(
            recipient.name,
            templateData.bookTitle,
            templateData.dueDate
          );
          break;
        default:
          continue;
      }

      const result = await sendMail({ 
        to: recipient.email, 
        ...emailOptions 
      });
      
      results.push({ email: recipient.email, success: true });
    } catch (error) {
      results.push({ 
        email: recipient.email, 
        success: false, 
        error: error.message 
      });
    }
  }

  return results;
};

module.exports = {
  sendMail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendOverdueReminder,
  sendBookingConfirmation,
  sendBulkNotification,
  templates,
};