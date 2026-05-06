const crypto = require('crypto');

/**
 * Generate a secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  // Generate cryptographically secure random bytes
  const buffer = crypto.randomBytes(4);
  const randomNumber = parseInt(buffer.toString('hex'), 16);
  
  // Ensure it's a 6-digit number
  const otp = (randomNumber % 900000) + 100000;
  
  return otp.toString();
};

/**
 * Generate alphanumeric OTP (for cases where letters are needed)
 * @param {number} length - Length of OTP
 * @returns {string} Alphanumeric OTP
 */
const generateAlphanumericOTP = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let otp = '';
  
  const bytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    otp += chars[bytes[i] % chars.length];
  }
  
  return otp;
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} Whether OTP is valid
 */
const validateOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

module.exports = {
  generateOTP,
  generateAlphanumericOTP,
  validateOTPFormat,
};