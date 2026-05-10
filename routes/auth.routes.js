// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/auth.controller');
// const { authenticate } = require('../middleware/auth');
// const { 
//   registerRules, 
//   loginRules, 
//   resetPasswordRules,
//   otpRules,
//   verifyOtpRules,
//   validate 
// } = require('../middleware/validate');

// /**
//  * @swagger
//  * /api/auth/register:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Register a new user
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - name
//  *               - email
//  *               - password
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *                 format: email
//  *               password:
//  *                 type: string
//  *                 format: password
//  *     responses:
//  *       201:
//  *         description: User registered successfully
//  *       400:
//  *         description: Validation error
//  */
// router.post('/register', registerRules, validate, authController.register);

// /**
//  * @swagger
//  * /api/auth/login:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Login user
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - email
//  *               - password
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *               password:
//  *                 type: string
//  *                 format: password
//  *     responses:
//  *       200:
//  *         description: Login successful
//  *       401:
//  *         description: Invalid credentials
//  */
// router.post('/login', loginRules, validate, authController.login);

// /**
//  * @swagger
//  * /api/auth/refresh-token:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Refresh access token
//  */
// router.post('/refresh-token', authController.refreshToken);

// /**
//  * @swagger
//  * /api/auth/forgot-password:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Request password reset
//  */
// router.post('/forgot-password', authController.forgotPassword);

// /**
//  * @swagger
//  * /api/auth/reset-password/:token:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Reset password with token
//  */
// router.post('/reset-password/:token', resetPasswordRules, validate, authController.resetPassword);

// /**
//  * @swagger
//  * /api/auth/send-otp:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Send OTP to email
//  */
// router.post('/send-otp', otpRules, validate, authController.sendOTP);

// /**
//  * @swagger
//  * /api/auth/verify-otp:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Verify OTP
//  */
// router.post('/verify-otp', verifyOtpRules, validate, authController.verifyOTP);

// /**
//  * @swagger
//  * /api/auth/reset-with-otp:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Reset password with OTP
//  */
// router.post('/reset-with-otp', authController.resetWithOTP);

// // ==================== PROTECTED ROUTES ====================

// /**
//  * @swagger
//  * /api/auth/profile:
//  *   get:
//  *     tags: [Authentication]
//  *     summary: Get current user profile
//  *     security:
//  *       - bearerAuth: []
//  */

// /**
//  * @swagger
//  * /api/auth/profile:
//  *   put:
//  *     tags: [Authentication]
//  *     summary: Update user profile
//  *     security:
//  *       - bearerAuth: []
//  */

// /**
//  * @swagger
//  * /api/auth/change-password:
//  *   put:
//  *     tags: [Authentication]
//  *     summary: Change password
//  *     security:
//  *       - bearerAuth: []
//  */

// /**
//  * @swagger
//  * /api/auth/logout:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Logout user
//  *     security:
//  *       - bearerAuth: []
//  */

// // Use authenticate middleware for protected routes
// router.get('/profile', authenticate, authController.getProfile);
// router.put('/profile', authenticate, authController.updateProfile);
// router.put('/change-password', authenticate, authController.changePassword);
// router.post('/logout', authenticate, authController.logout);

// module.exports = router;

// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/auth.controller');
// const { authenticate } = require('../middleware/auth');
// const { authorize } = require('../middleware/role');
// const { 
//   registerRules, 
//   loginRules, 
//   resetPasswordRules,
//   otpRules,
//   verifyOtpRules,
//   validate 
// } = require('../middleware/validate');

// // Public routes
// router.post('/register', registerRules, validate, authController.register);
// router.post('/login', loginRules, validate, authController.login);
// router.post('/refresh-token', authController.refreshToken);
// router.post('/forgot-password', authController.forgotPassword);
// router.post('/reset-password/:token', resetPasswordRules, validate, authController.resetPassword);
// router.post('/send-otp', otpRules, validate, authController.sendOTP);
// router.post('/verify-otp', verifyOtpRules, validate, authController.verifyOTP);
// router.post('/reset-with-otp', resetPasswordRules, validate, authController.resetWithOTP);

// // Protected routes
// router.get('/profile', authenticate, authController.getProfile);
// router.put('/profile', authenticate, authController.updateProfile);
// router.put('/change-password', authenticate, authController.changePassword);
// router.post('/logout', authenticate, authController.logout);

// module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Public routes - NO authentication middleware
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-with-otp', authController.resetWithOTP);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;