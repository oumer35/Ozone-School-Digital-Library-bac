// const db = require('../config/db');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const { validationResult } = require('express-validator');
// const { generateOTP } = require('../utils/otp');
// const { sendEmail } = require('../utils/mailer');
// const securityLogger = require('../utils/securityLogger');
// const auditLogger = require('../utils/auditLogger');
// require('dotenv').config();

// /**
//  * Register new user
//  * @route POST /api/auth/register
//  */
// exports.register = async (req, res) => {
//   try {
//     // Validate input
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         status: 'error', 
//         errors: errors.array() 
//       });
//     }

//     const { name, email, password } = req.body;

//     // Check if user already exists
//     const existingUser = await db.query(
//       'SELECT id FROM users WHERE email = $1',
//       [email.toLowerCase()]
//     );

//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ 
//         status: 'error',
//         message: 'User already exists with this email' 
//       });
//     }

//     // Hash password
//     const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     // Create user
//     const result = await db.query(
//       `INSERT INTO users (name, email, password, role) 
//        VALUES ($1, $2, $3, 'user') 
//        RETURNING id, name, email, role, created_at`,
//       [name, email.toLowerCase(), hashedPassword]
//     );

//     const user = result.rows[0];

//     // Generate JWT token
//     const token = generateToken(user);

//     // Log audit
//     await auditLogger.log({
//       user_id: user.id,
//       action: 'REGISTER',
//       entity_type: 'users',
//       entity_id: user.id,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Send welcome email
//     await sendEmail({
//       to: user.email,
//       subject: 'Welcome to Library Management System',
//       html: `<h1>Welcome ${user.name}!</h1>
//              <p>Your account has been created successfully.</p>
//              <p>You can now log in and start browsing our library.</p>`,
//     });

//     res.status(201).json({
//       status: 'success',
//       message: 'User registered successfully',
//       data: {
//         user,
//         token,
//       },
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error during registration',
//     });
//   }
// };

// /**
//  * Login user
//  * @route POST /api/auth/login
//  */
// exports.login = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         status: 'error', 
//         errors: errors.array() 
//       });
//     }

//     const { email, password } = req.body;

//     // Find user
//     const result = await db.query(
//       'SELECT * FROM users WHERE email = $1',
//       [email.toLowerCase()]
//     );

//     if (result.rows.length === 0) {
//       await securityLogger.log({
//         user_id: null,
//         action: 'LOGIN',
//         status: 'failed',
//         details: { email, reason: 'User not found' },
//         ip_address: req.ip,
//         user_agent: req.get('user-agent'),
//       });

//       return res.status(401).json({
//         status: 'error',
//         message: 'Invalid email or password',
//       });
//     }

//     const user = result.rows[0];

//     // Check if account is locked
//     if (user.locked_until && new Date(user.locked_until) > new Date()) {
//       await securityLogger.log({
//         user_id: user.id,
//         action: 'LOGIN',
//         status: 'blocked',
//         details: { reason: 'Account locked' },
//         ip_address: req.ip,
//         user_agent: req.get('user-agent'),
//       });

//       return res.status(423).json({
//         status: 'error',
//         message: 'Account is temporarily locked. Please try again later.',
//       });
//     }

//     // Check if account is active
//     if (!user.is_active) {
//       return res.status(403).json({
//         status: 'error',
//         message: 'Account is deactivated. Please contact administrator.',
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, user.password);

//     if (!isValidPassword) {
//       // Increment failed attempts
//       const failedAttempts = (user.failed_login_attempts || 0) + 1;
//       const updateData = {
//         failed_login_attempts: failedAttempts,
//       };

//       // Lock account if too many failed attempts
//       if (failedAttempts >= (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5)) {
//         updateData.locked_until = new Date(
//           Date.now() + (parseInt(process.env.LOCKOUT_DURATION) || 15) * 60 * 1000
//         );
//       }

//       await db.query(
//         'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
//         [updateData.failed_login_attempts, updateData.locked_until, user.id]
//       );

//       await securityLogger.log({
//         user_id: user.id,
//         action: 'LOGIN',
//         status: 'failed',
//         details: { reason: 'Invalid password', attempt: failedAttempts },
//         ip_address: req.ip,
//         user_agent: req.get('user-agent'),
//       });

//       // Emit real-time alert
//       global.io.emit('security-alert', {
//         type: 'FAILED_LOGIN',
//         message: `Failed login attempt for ${user.email}`,
//         time: new Date().toISOString(),
//         details: {
//           userId: user.id,
//           attempts: failedAttempts,
//         },
//       });

//       return res.status(401).json({
//         status: 'error',
//         message: 'Invalid email or password',
//       });
//     }

//     // Reset failed attempts on successful login
//     await db.query(
//       `UPDATE users 
//        SET failed_login_attempts = 0, 
//            locked_until = NULL, 
//            last_login = CURRENT_TIMESTAMP 
//        WHERE id = $1`,
//       [user.id]
//     );

//     // Generate tokens
//     const token = generateToken(user);
//     const refreshToken = generateRefreshToken(user);

//     // Store refresh token
//     await db.query(
//       'UPDATE users SET refresh_token = $1 WHERE id = $2',
//       [refreshToken, user.id]
//     );

//     // Log security event
//     await securityLogger.log({
//       user_id: user.id,
//       action: 'LOGIN',
//       status: 'success',
//       details: { email: user.email },
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Log audit
//     await auditLogger.log({
//       user_id: user.id,
//       action: 'LOGIN',
//       entity_type: 'users',
//       entity_id: user.id,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Emit real-time alert
//     global.io.emit('security-alert', {
//       type: 'SUCCESSFUL_LOGIN',
//       message: `${user.name} logged in successfully`,
//       time: new Date().toISOString(),
//     });

//     // Remove sensitive data
//     delete user.password;
//     delete user.reset_token;
//     delete user.otp_code;
//     delete user.refresh_token;

//     res.json({
//       status: 'success',
//       message: 'Login successful',
//       data: {
//         user,
//         token,
//         refreshToken,
//       },
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error during login',
//     });
//   }
// };

// /**
//  * Refresh token
//  * @route POST /api/auth/refresh-token
//  */
// exports.refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Refresh token is required',
//       });
//     }

//     // Verify refresh token
//     const decoded = jwt.verify(
//       refreshToken,
//       process.env.JWT_REFRESH_SECRET || 'refresh_secret'
//     );

//     // Find user with this refresh token
//     const result = await db.query(
//       'SELECT * FROM users WHERE id = $1 AND refresh_token = $2',
//       [decoded.id, refreshToken]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Invalid refresh token',
//       });
//     }

//     const user = result.rows[0];

//     // Generate new tokens
//     const newToken = generateToken(user);
//     const newRefreshToken = generateRefreshToken(user);

//     // Update refresh token in database
//     await db.query(
//       'UPDATE users SET refresh_token = $1 WHERE id = $2',
//       [newRefreshToken, user.id]
//     );

//     res.json({
//       status: 'success',
//       data: {
//         token: newToken,
//         refreshToken: newRefreshToken,
//       },
//     });
//   } catch (error) {
//     console.error('Refresh token error:', error);
//     res.status(401).json({
//       status: 'error',
//       message: 'Invalid or expired refresh token',
//     });
//   }
// };

// /**
//  * Forgot password
//  * @route POST /api/auth/forgot-password
//  */
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check if user exists (but don't reveal this information)
//     const result = await db.query(
//       'SELECT id, email, name FROM users WHERE email = $1',
//       [email.toLowerCase()]
//     );

//     // Always return success to prevent email enumeration
//     if (result.rows.length === 0) {
//       return res.json({
//         status: 'success',
//         message: 'If the email exists, a password reset link has been sent.',
//       });
//     }

//     const user = result.rows[0];

//     // Generate reset token
//     const resetToken = jwt.sign(
//       { id: user.id, type: 'password_reset' },
//       process.env.JWT_SECRET || 'secret',
//       { expiresIn: '15m' }
//     );

//     // Store reset token
//     await db.query(
//       `UPDATE users 
//        SET reset_token = $1, 
//            reset_token_expiry = NOW() + INTERVAL '15 minutes' 
//        WHERE id = $2`,
//       [resetToken, user.id]
//     );

//     // Generate reset link
//     const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

//     // Send email (in development, log to console)
//     if (process.env.NODE_ENV === 'development') {
//       console.log('Password Reset Link:', resetLink);
//     } else {
//       await sendEmail({
//         to: user.email,
//         subject: 'Password Reset Request',
//         html: `
//           <h1>Password Reset Request</h1>
//           <p>Hello ${user.name},</p>
//           <p>You have requested to reset your password. Click the link below to proceed:</p>
//           <a href="${resetLink}" style="
//             display: inline-block;
//             padding: 10px 20px;
//             background-color: #1976d2;
//             color: white;
//             text-decoration: none;
//             border-radius: 5px;
//           ">Reset Password</a>
//           <p>This link will expire in 15 minutes.</p>
//           <p>If you didn't request this, please ignore this email.</p>
//         `,
//       });
//     }

//     // Log security event
//     await securityLogger.log({
//       user_id: user.id,
//       action: 'PASSWORD_RESET_REQUEST',
//       status: 'success',
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Emit real-time alert
//     global.io.emit('security-alert', {
//       type: 'PASSWORD_RESET_REQUEST',
//       message: `Password reset requested for ${user.email}`,
//       time: new Date().toISOString(),
//     });

//     res.json({
//       status: 'success',
//       message: 'If the email exists, a password reset link has been sent.',
//     });
//   } catch (error) {
//     console.error('Forgot password error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error processing password reset request',
//     });
//   }
// };

// /**
//  * Reset password
//  * @route POST /api/auth/reset-password/:token
//  */
// exports.resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;

//     // Verify token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
//     } catch (error) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid or expired reset token',
//       });
//     }

//     if (decoded.type !== 'password_reset') {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid token type',
//       });
//     }

//     // Check if token exists in database
//     const userResult = await db.query(
//       `SELECT id, email FROM users 
//        WHERE id = $1 
//        AND reset_token = $2 
//        AND reset_token_expiry > NOW()`,
//       [decoded.id, token]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid or expired reset token',
//       });
//     }

//     const user = userResult.rows[0];

//     // Hash new password
//     const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     // Update password and clear reset token
//     await db.query(
//       `UPDATE users 
//        SET password = $1, 
//            reset_token = NULL, 
//            reset_token_expiry = NULL,
//            failed_login_attempts = 0,
//            locked_until = NULL
//        WHERE id = $2`,
//       [hashedPassword, user.id]
//     );

//     // Log security event
//     await securityLogger.log({
//       user_id: user.id,
//       action: 'PASSWORD_RESET',
//       status: 'success',
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Log audit
//     await auditLogger.log({
//       user_id: user.id,
//       action: 'PASSWORD_CHANGED',
//       entity_type: 'users',
//       entity_id: user.id,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Emit real-time alert
//     global.io.emit('security-alert', {
//       type: 'PASSWORD_RESET',
//       message: `Password reset completed for ${user.email}`,
//       time: new Date().toISOString(),
//     });

//     res.json({
//       status: 'success',
//       message: 'Password has been reset successfully',
//     });
//   } catch (error) {
//     console.error('Reset password error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error resetting password',
//     });
//   }
// };

// /**
//  * Send OTP
//  * @route POST /api/auth/send-otp
//  */
// exports.sendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check if user exists
//     const result = await db.query(
//       'SELECT id, email, name FROM users WHERE email = $1',
//       [email.toLowerCase()]
//     );

//     // Don't reveal if user exists
//     if (result.rows.length === 0) {
//       return res.json({
//         status: 'success',
//         message: 'If the email exists, an OTP has been sent.',
//       });
//     }

//     const user = result.rows[0];

//     // Generate OTP
//     const otp = generateOTP();
//     const otpExpiry = new Date(
//       Date.now() + (parseInt(process.env.OTP_EXPIRY) || 5) * 60 * 1000
//     );

//     // Store OTP
//     await db.query(
//       `UPDATE users 
//        SET otp_code = $1, 
//            otp_expiry = $2 
//        WHERE id = $3`,
//       [otp, otpExpiry, user.id]
//     );

//     // Send OTP (in development, log to console)
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`OTP for ${email}:`, otp);
//     } else {
//       await sendEmail({
//         to: user.email,
//         subject: 'Your OTP Code',
//         html: `
//           <h1>Your OTP Code</h1>
//           <p>Hello ${user.name},</p>
//           <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
//           <p>This code will expire in ${process.env.OTP_EXPIRY || 5} minutes.</p>
//           <p>If you didn't request this, please ignore this email.</p>
//         `,
//       });
//     }

//     // Log security event
//     await securityLogger.log({
//       user_id: user.id,
//       action: 'OTP_SENT',
//       status: 'success',
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Emit real-time alert
//     global.io.emit('security-alert', {
//       type: 'OTP_REQUEST',
//       message: `OTP sent to ${user.email}`,
//       time: new Date().toISOString(),
//     });

//     res.json({
//       status: 'success',
//       message: 'If the email exists, an OTP has been sent.',
//     });
//   } catch (error) {
//     console.error('Send OTP error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error sending OTP',
//     });
//   }
// };

// /**
//  * Verify OTP
//  * @route POST /api/auth/verify-otp
//  */
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const result = await db.query(
//       `SELECT id, email 
//        FROM users 
//        WHERE email = $1 
//        AND otp_code = $2 
//        AND otp_expiry > NOW()`,
//       [email.toLowerCase(), otp]
//     );

//     if (result.rows.length === 0) {
//       await securityLogger.log({
//         action: 'OTP_VERIFY',
//         status: 'failed',
//         details: { email, reason: 'Invalid or expired OTP' },
//         ip_address: req.ip,
//       });

//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid or expired OTP',
//       });
//     }

//     // Clear OTP after successful verification
//     await db.query(
//       'UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = $1',
//       [result.rows[0].id]
//     );

//     res.json({
//       status: 'success',
//       message: 'OTP verified successfully',
//     });
//   } catch (error) {
//     console.error('Verify OTP error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error verifying OTP',
//     });
//   }
// };

// /**
//  * Reset password with OTP
//  * @route POST /api/auth/reset-with-otp
//  */
// exports.resetWithOTP = async (req, res) => {
//   try {
//     const { email, otp, password } = req.body;

//     const result = await db.query(
//       `SELECT id, email 
//        FROM users 
//        WHERE email = $1 
//        AND otp_code = $2 
//        AND otp_expiry > NOW()`,
//       [email.toLowerCase(), otp]
//     );

//     if (result.rows.length === 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid or expired OTP',
//       });
//     }

//     const user = result.rows[0];

//     // Hash new password
//     const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     // Update password and clear OTP
//     await db.query(
//       `UPDATE users 
//        SET password = $1, 
//            otp_code = NULL, 
//            otp_expiry = NULL,
//            failed_login_attempts = 0,
//            locked_until = NULL
//        WHERE id = $2`,
//       [hashedPassword, user.id]
//     );

//     // Log security event
//     await securityLogger.log({
//       user_id: user.id,
//       action: 'PASSWORD_RESET_OTP',
//       status: 'success',
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     await auditLogger.log({
//       user_id: user.id,
//       action: 'PASSWORD_CHANGED_OTP',
//       entity_type: 'users',
//       entity_id: user.id,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     // Emit real-time alert
//     global.io.emit('security-alert', {
//       type: 'PASSWORD_RESET_OTP',
//       message: `Password reset via OTP for ${user.email}`,
//       time: new Date().toISOString(),
//     });

//     res.json({
//       status: 'success',
//       message: 'Password reset successful',
//     });
//   } catch (error) {
//     console.error('Reset with OTP error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error resetting password',
//     });
//   }
// };

// /**
//  * Get current user profile
//  * @route GET /api/auth/profile
//  */
// exports.getProfile = async (req, res) => {
//   try {
//     const result = await db.query(
//       `SELECT id, name, email, role, avatar_url, phone, 
//               is_active, created_at, last_login 
//        FROM users 
//        WHERE id = $1`,
//       [req.user.id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'User not found',
//       });
//     }

//     const user = result.rows[0];

//     // Get user statistics
//     const stats = await db.query(
//       `SELECT 
//         COUNT(*) as total_bookings,
//         COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_bookings,
//         COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_bookings,
//         COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_bookings
//        FROM bookings 
//        WHERE user_id = $1`,
//       [user.id]
//     );

//     res.json({
//       status: 'success',
//       data: {
//         user,
//         stats: stats.rows[0],
//       },
//     });
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error fetching profile',
//     });
//   }
// };

// /**
//  * Update user profile
//  * @route PUT /api/auth/profile
//  */
// exports.updateProfile = async (req, res) => {
//   try {
//     const { name, phone, avatar_url } = req.body;
//     const userId = req.user.id;

//     const result = await db.query(
//       `UPDATE users 
//        SET name = COALESCE($1, name),
//            phone = COALESCE($2, phone),
//            avatar_url = COALESCE($3, avatar_url)
//        WHERE id = $4
//        RETURNING id, name, email, role, avatar_url, phone`,
//       [name, phone, avatar_url, userId]
//     );

//     await auditLogger.log({
//       user_id: userId,
//       action: 'UPDATE_PROFILE',
//       entity_type: 'users',
//       entity_id: userId,
//       new_values: { name, phone, avatar_url },
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     res.json({
//       status: 'success',
//       data: result.rows[0],
//     });
//   } catch (error) {
//     console.error('Update profile error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error updating profile',
//     });
//   }
// };

// /**
//  * Change password
//  * @route PUT /api/auth/change-password
//  */
// exports.changePassword = async (req, res) => {
//   try {
//     const { oldPassword, newPassword } = req.body;
//     const userId = req.user.id;

//     // Get current user
//     const result = await db.query(
//       'SELECT password FROM users WHERE id = $1',
//       [userId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'User not found',
//       });
//     }

//     // Verify old password
//     const isValid = await bcrypt.compare(oldPassword, result.rows[0].password);
//     if (!isValid) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Current password is incorrect',
//       });
//     }

//     // Hash and update new password
//     const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
//     const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

//     await db.query(
//       'UPDATE users SET password = $1 WHERE id = $2',
//       [hashedPassword, userId]
//     );

//     await securityLogger.log({
//       user_id: userId,
//       action: 'PASSWORD_CHANGE',
//       status: 'success',
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     await auditLogger.log({
//       user_id: userId,
//       action: 'PASSWORD_CHANGED_SELF',
//       entity_type: 'users',
//       entity_id: userId,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     res.json({
//       status: 'success',
//       message: 'Password changed successfully',
//     });
//   } catch (error) {
//     console.error('Change password error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error changing password',
//     });
//   }
// };

// /**
//  * Logout user
//  * @route POST /api/auth/logout
//  */
// exports.logout = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Clear refresh token
//     await db.query(
//       'UPDATE users SET refresh_token = NULL WHERE id = $1',
//       [userId]
//     );

//     await auditLogger.log({
//       user_id: userId,
//       action: 'LOGOUT',
//       entity_type: 'users',
//       entity_id: userId,
//       ip_address: req.ip,
//       user_agent: req.get('user-agent'),
//     });

//     res.json({
//       status: 'success',
//       message: 'Logged out successfully',
//     });
//   } catch (error) {
//     console.error('Logout error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error during logout',
//     });
//   }
// };

// // Helper functions
// function generateToken(user) {
//   return jwt.sign(
//     { 
//       id: user.id, 
//       email: user.email, 
//       role: user.role 
//     },
//     process.env.JWT_SECRET || 'secret',
//     { expiresIn: process.env.JWT_EXPIRE || '1d' }
//   );
// }

// function generateRefreshToken(user) {
//   return jwt.sign(
//     { id: user.id, type: 'refresh' },
//     process.env.JWT_REFRESH_SECRET || 'refresh_secret',
//     { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
//   );
// }

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/otp');
const { sendEmail } = require('../utils/mailer');
const securityLogger = require('../utils/securityLogger');
const auditLogger = require('../utils/auditLogger');
require('dotenv').config();

// Helper functions
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRE || '1d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Register new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Name, email, and password are required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'User already exists with this email' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(
      `INSERT INTO users (name, email, password, role) 
       VALUES ($1, $2, $3, 'user') 
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    // Try to log audit (don't fail if it fails)
    try {
      await auditLogger.log({
        user_id: user.id,
        action: 'REGISTER',
        entity_type: 'users',
        entity_id: user.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Audit log failed (non-critical):', auditError.message);
    }

    // Try to send welcome email (non-blocking, don't fail if it fails)
    try {
      sendEmail({
        to: user.email,
        subject: 'Welcome to Library Management System',
        html: `<h1>Welcome ${user.name}!</h1>
               <p>Your account has been created successfully.</p>`,
      }).catch(err => console.error('Welcome email failed (non-critical):', err.message));
    } catch (emailError) {
      console.error('Email setup failed (non-critical):', emailError.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Error during registration: ' + error.message,
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    console.log(`🔑 Login attempt for: ${email}`);

    // Find user by email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.is_active === false) {
      console.log(`🚫 Deactivated account attempt: ${email}`);
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    // Compare passwords
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('❌ bcrypt comparison error:', bcryptError.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error verifying credentials',
      });
    }

    if (!isValidPassword) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0 WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
  console.log('🔑 Signing token with secret length:', JWT_SECRET.length);

  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

    // Remove sensitive data before sending response
    const { 
      password: _, 
      otp_code: __, 
      otp_expiry: ___, 
      reset_token: ____, 
      reset_token_expiry: _____,
      refresh_token: ______,
      ...safeUser 
    } = user;

    console.log(`✅ Login successful for: ${email} (${user.role})`);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: safeUser,
        token,
      },
    });

  } catch (error) {
    console.error('💥 Login error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.',
    });
  }
};

/**
 * Refresh token
 * @route POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret'
    );

    const result = await db.query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token = $2',
      [decoded.id, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
      });
    }

    const user = result.rows[0];
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await db.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [newRefreshToken, user.id]
    );

    res.json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token',
    });
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await db.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    const user = result.rows[0];

    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    await db.query(
      `UPDATE users 
       SET reset_token = $1, 
           reset_token_expiry = NOW() + INTERVAL '15 minutes' 
       WHERE id = $2`,
      [resetToken, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('Password Reset Link:', resetLink);
    } else {
      sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `<h1>Password Reset Request</h1>
               <p>Hello ${user.name},</p>
               <p>Click the link below to reset your password:</p>
               <a href="${resetLink}">Reset Password</a>
               <p>This link will expire in 15 minutes.</p>`,
      }).catch(err => console.error('Password reset email failed:', err));
    }

    await securityLogger.log({
      user_id: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    if (global.io) {
      global.io.emit('security-alert', {
        type: 'PASSWORD_RESET_REQUEST',
        message: `Password reset requested for ${user.email}`,
        time: new Date().toISOString(),
      });
    }

    res.json({
      status: 'success',
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing password reset request',
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid token type',
      });
    }

    const userResult = await db.query(
      `SELECT id, email FROM users 
       WHERE id = $1 
       AND reset_token = $2 
       AND reset_token_expiry > NOW()`,
      [decoded.id, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
      });
    }

    const user = userResult.rows[0];
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.query(
      `UPDATE users 
       SET password = $1, 
           reset_token = NULL, 
           reset_token_expiry = NULL,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    await securityLogger.log({
      user_id: user.id,
      action: 'PASSWORD_RESET',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    await auditLogger.log({
      user_id: user.id,
      action: 'PASSWORD_CHANGED',
      entity_type: 'users',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    if (global.io) {
      global.io.emit('security-alert', {
        type: 'PASSWORD_RESET',
        message: `Password reset completed for ${user.email}`,
        time: new Date().toISOString(),
      });
    }

    res.json({
      status: 'success',
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password',
    });
  }
};

/**
 * Send OTP
 * @route POST /api/auth/send-otp
 */
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await db.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    const user = result.rows[0];
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY) || 5) * 60 * 1000
    );

    await db.query(
      `UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3`,
      [otp, otpExpiry, user.id]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP for ${email}:`, otp);
    } else {
      sendEmail({
        to: user.email,
        subject: 'Your OTP Code',
        html: `<h1>Your OTP Code</h1>
               <p>Your OTP code is: <strong>${otp}</strong></p>
               <p>This code will expire in ${process.env.OTP_EXPIRY || 5} minutes.</p>`,
      }).catch(err => console.error('OTP email failed:', err));
    }

    await securityLogger.log({
      user_id: user.id,
      action: 'OTP_SENT',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'If the email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending OTP',
    });
  }
};

/**
 * Verify OTP
 * @route POST /api/auth/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await db.query(
      `SELECT id, email FROM users 
       WHERE email = $1 AND otp_code = $2 AND otp_expiry > NOW()`,
      [email.toLowerCase(), otp]
    );

    if (result.rows.length === 0) {
      await securityLogger.log({
        action: 'OTP_VERIFY',
        status: 'failed',
        details: { email, reason: 'Invalid or expired OTP' },
        ip_address: req.ip,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP',
      });
    }

    await db.query(
      'UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({
      status: 'success',
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying OTP',
    });
  }
};

/**
 * Reset password with OTP
 * @route POST /api/auth/reset-with-otp
 */
exports.resetWithOTP = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const result = await db.query(
      `SELECT id, email FROM users 
       WHERE email = $1 AND otp_code = $2 AND otp_expiry > NOW()`,
      [email.toLowerCase(), otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP',
      });
    }

    const user = result.rows[0];
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.query(
      `UPDATE users 
       SET password = $1, otp_code = NULL, otp_expiry = NULL,
           failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    await securityLogger.log({
      user_id: user.id,
      action: 'PASSWORD_RESET_OTP',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    await auditLogger.log({
      user_id: user.id,
      action: 'PASSWORD_CHANGED_OTP',
      entity_type: 'users',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset with OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password',
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, avatar_url, phone, 
              is_active, created_at, last_login 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const user = result.rows[0];
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_bookings,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_bookings,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_bookings
       FROM bookings WHERE user_id = $1`,
      [user.id]
    );

    res.json({
      status: 'success',
      data: { user, stats: stats.rows[0] },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile',
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, name, email, role, avatar_url, phone`,
      [name, phone, avatar_url, userId]
    );

    await auditLogger.log({
      user_id: userId,
      action: 'UPDATE_PROFILE',
      entity_type: 'users',
      entity_id: userId,
      new_values: { name, phone, avatar_url },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile',
    });
  }
};

/**
 * Change password
 * @route PUT /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await db.query('SELECT password FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Current password is incorrect' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    await securityLogger.log({
      user_id: userId,
      action: 'PASSWORD_CHANGE',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    await auditLogger.log({
      user_id: userId,
      action: 'PASSWORD_CHANGED_SELF',
      entity_type: 'users',
      entity_id: userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({ status: 'success', message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ status: 'error', message: 'Error changing password' });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);

    await auditLogger.log({
      user_id: userId,
      action: 'LOGOUT',
      entity_type: 'users',
      entity_id: userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ status: 'error', message: 'Error during logout' });
  }
};