const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

/**
 * @swagger
 * /api/security/logs:
 *   get:
 *     tags: [Security]
 *     summary: Get security logs (librarian only)
 */
router.get('/logs', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, status, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sl.*, u.name as user_name, u.email as user_email,
             COUNT(*) OVER() as total_count
      FROM security_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      params.push(action);
      query += ` AND sl.action = $${paramCount}`;
    }

    if (status) {
      paramCount++;
      params.push(status);
      query += ` AND sl.status = $${paramCount}`;
    }

    if (user_id) {
      paramCount++;
      params.push(user_id);
      query += ` AND sl.user_id = $${paramCount}`;
    }

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    query += ` ORDER BY sl.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      status: 'success',
      data: result.rows.map(row => {
        const { total_count, ...log } = row;
        return log;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Security logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching security logs',
    });
  }
});

/**
 * @swagger
 * /api/security/summary:
 *   get:
 *     tags: [Security]
 *     summary: Get security summary
 */
router.get('/summary', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const summary = await db.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_attempts,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_attempts,
        COUNT(CASE WHEN action = 'LOGIN' AND status = 'failed' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN action = 'PASSWORD_RESET' THEN 1 END) as password_resets,
        COUNT(CASE WHEN action = 'OTP_SENT' THEN 1 END) as otp_requests,
        COUNT(DISTINCT user_id) as unique_users_affected
      FROM security_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    const recentFailedLogins = await db.query(`
      SELECT sl.*, u.email
      FROM security_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE sl.action = 'LOGIN' AND sl.status = 'failed'
      ORDER BY sl.created_at DESC
      LIMIT 10
    `);

    res.json({
      status: 'success',
      data: {
        summary: summary.rows[0],
        recent_failed_logins: recentFailedLogins.rows,
      },
    });
  } catch (error) {
    console.error('Security summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching security summary',
    });
  }
});

/**
 * @swagger
 * /api/security/audit-logs:
 *   get:
 *     tags: [Security]
 *     summary: Get audit logs (librarian only)
 */
router.get('/audit-logs', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email,
             COUNT(*) OVER() as total_count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      params.push(`%${action}%`);
      query += ` AND al.action ILIKE $${paramCount}`;
    }

    if (entity_type) {
      paramCount++;
      params.push(entity_type);
      query += ` AND al.entity_type = $${paramCount}`;
    }

    if (user_id) {
      paramCount++;
      params.push(user_id);
      query += ` AND al.user_id = $${paramCount}`;
    }

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      status: 'success',
      data: result.rows.map(row => {
        const { total_count, ...log } = row;
        return log;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching audit logs',
    });
  }
});

module.exports = router;