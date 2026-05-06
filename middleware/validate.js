// const { body, param, query, validationResult } = require('express-validator');

// /**
//  * Validation rules for registration
//  */
// const registerRules = [
//   body('name')
//     .trim()
//     .notEmpty().withMessage('Name is required')
//     .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email')
//     .normalizeEmail(),
  
//   body('password')
//     .notEmpty().withMessage('Password is required')
//     .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
//     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
//     .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
// ];

// /**
//  * Validation rules for login
//  */
// const loginRules = [
//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email')
//     .normalizeEmail(),
  
//   body('password')
//     .notEmpty().withMessage('Password is required'),
// ];

// /**
//  * Validation rules for password reset
//  */
// const resetPasswordRules = [
//   body('password')
//     .notEmpty().withMessage('Password is required')
//     .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
//     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
//     .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
// ];

// /**
//  * Validation rules for book creation/update
//  */
// const bookRules = [
//   body('title')
//     .trim()
//     .notEmpty().withMessage('Title is required')
//     .isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
  
//   body('author')
//     .trim()
//     .notEmpty().withMessage('Author is required')
//     .isLength({ max: 255 }).withMessage('Author must be less than 255 characters'),
  
//   body('isbn')
//     .optional()
//     .trim()
//     .isISBN().withMessage('Please provide a valid ISBN'),
  
//   body('total_copies')
//     .optional()
//     .isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  
//   body('category_id')
//     .optional()
//     .isInt().withMessage('Category ID must be a number'),
  
//   body('publication_year')
//     .optional()
//     .isInt({ min: 1000, max: new Date().getFullYear() })
//     .withMessage('Please provide a valid publication year'),
// ];

// /**
//  * Validation rules for booking
//  */
// const bookingRules = [
//   body('book_id')
//     .notEmpty().withMessage('Book ID is required')
//     .isInt().withMessage('Book ID must be a number'),
// ];

// /**
//  * Validation rules for sending OTP
//  */
// const otpRules = [
//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email')
//     .normalizeEmail(),
// ];

// /**
//  * Validation rules for verifying OTP
//  */
// const verifyOtpRules = [
//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email')
//     .normalizeEmail(),
  
//   body('otp')
//     .notEmpty().withMessage('OTP is required')
//     .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
//     .isNumeric().withMessage('OTP must be numeric'),
// ];

// /**
//  * Middleware to check validation results
//  */
// const validate = (req, res, next) => {
//   const errors = validationResult(req);
  
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       status: 'error',
//       message: 'Validation failed',
//       errors: errors.array().map(err => ({
//         field: err.path,
//         message: err.msg,
//       })),
//     });
//   }
  
//   next();
// };

// module.exports = {
//   registerRules,
//   loginRules,
//   resetPasswordRules,
//   bookRules,
//   bookingRules,
//   otpRules,
//   verifyOtpRules,
//   validate,
// };

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for registration
 */
const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

/**
 * Validation rules for login
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for password reset
 */
const resetPasswordRules = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

/**
 * Validation rules for book creation/update
 */
const bookRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
  
  body('author')
    .trim()
    .notEmpty().withMessage('Author is required')
    .isLength({ max: 255 }).withMessage('Author must be less than 255 characters'),
  
  body('isbn')
    .optional()
    .trim()
    .isISBN().withMessage('Please provide a valid ISBN'),
  
  body('total_copies')
    .optional()
    .isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  
  body('category_id')
    .optional()
    .isInt().withMessage('Category ID must be a number'),
  
  body('publication_year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Please provide a valid publication year'),
];

/**
 * Validation rules for booking
 */
const bookingRules = [
  body('book_id')
    .notEmpty().withMessage('Book ID is required')
    .isInt().withMessage('Book ID must be a number'),
];

/**
 * Validation rules for sending OTP
 */
const otpRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
];

/**
 * Validation rules for verifying OTP
 */
const verifyOtpRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  
  next();
};

module.exports = {
  registerRules,
  loginRules,
  resetPasswordRules,
  bookRules,
  bookingRules,
  otpRules,
  verifyOtpRules,
  validate,
};