const db = require('../config/db');

/**
 * Audit logger utility
 * Logs all important system actions for audit trail
 */
const auditLogger = {
  /**
   * Log an audit event
   * @param {Object} params - Audit parameters
   */
  log: async ({ user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent }) => {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user_id,
          action,
          entity_type,
          entity_id,
          old_values ? JSON.stringify(old_values) : null,
          new_values ? JSON.stringify(new_values) : null,
          ip_address || 'Unknown',
          user_agent || 'Unknown',
        ]
      );
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - logging shouldn't break the application
    }
  },

  /**
   * Log CRUD operations
   */
  logCreate: async (user_id, entity_type, entity_id, values, req) => {
    return auditLogger.log({
      user_id,
      action: `CREATE_${entity_type.toUpperCase()}`,
      entity_type,
      entity_id,
      new_values: values,
      ip_address: req?.ip,
      user_agent: req?.get('user-agent'),
    });
  },

  logUpdate: async (user_id, entity_type, entity_id, old_values, new_values, req) => {
    return auditLogger.log({
      user_id,
      action: `UPDATE_${entity_type.toUpperCase()}`,
      entity_type,
      entity_id,
      old_values,
      new_values,
      ip_address: req?.ip,
      user_agent: req?.get('user-agent'),
    });
  },

  logDelete: async (user_id, entity_type, entity_id, old_values, req) => {
    return auditLogger.log({
      user_id,
      action: `DELETE_${entity_type.toUpperCase()}`,
      entity_type,
      entity_id,
      old_values,
      ip_address: req?.ip,
      user_agent: req?.get('user-agent'),
    });
  },
};

module.exports = auditLogger;