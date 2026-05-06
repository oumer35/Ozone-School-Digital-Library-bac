const db = require('../config/db');

/**
 * Security logger utility
 * Logs security-related events to the database
 */
const securityLogger = {
  /**
   * Log a security event
   * @param {Object} params - Log parameters
   * @param {number} params.user_id - User ID
   * @param {string} params.action - Action performed
   * @param {string} params.status - Status (success/failed/blocked)
   * @param {Object} [params.details] - Additional details
   * @param {string} [params.ip_address] - IP address
   * @param {string} [params.user_agent] - User agent
   */
  log: async ({ user_id, action, status, details = {}, ip_address, user_agent }) => {
    try {
      await db.query(
        `INSERT INTO security_logs (user_id, action, status, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user_id,
          action,
          status,
          JSON.stringify(details),
          ip_address || 'Unknown',
          user_agent || 'Unknown',
        ]
      );
    } catch (error) {
      console.error('Security logging error:', error);
      // Don't throw - logging shouldn't break the application
    }
  },

  /**
   * Log a failed login attempt
   */
  logFailedLogin: async (email, reason, ip_address) => {
    return securityLogger.log({
      user_id: null,
      action: 'LOGIN',
      status: 'failed',
      details: { email, reason },
      ip_address,
    });
  },

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity: async (user_id, activity, ip_address) => {
    return securityLogger.log({
      user_id,
      action: 'SUSPICIOUS_ACTIVITY',
      status: 'failed',
      details: { activity },
      ip_address,
    });
  },
};

module.exports = securityLogger;