const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const auditLogger = require('../utils/auditLogger');

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (librarian only)
 */
router.get('/', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active,
             u.last_login, u.created_at,
             COUNT(bk.id) as total_bookings,
             COUNT(CASE WHEN bk.status = 'borrowed' THEN 1 END) as active_bookings,
             COUNT(*) OVER() as total_count
      FROM users u
      LEFT JOIN bookings bk ON u.id = bk.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      params.push(role);
      query += ` AND u.role = $${paramCount}`;
    }

    if (search) {
      paramCount++;
      params.push(`%${search}%`);
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
    }

    query += ` GROUP BY u.id`;

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      status: 'success',
      data: result.rows.map(row => {
        const { total_count, ...user } = row;
        return user;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (librarian only)
 */
router.get('/:id', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active,
              u.last_login, u.created_at, u.updated_at
       FROM users u
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_bookings,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_bookings,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_bookings
       FROM bookings 
       WHERE user_id = $1`,
      [id]
    );

    res.json({
      status: 'success',
      data: {
        ...result.rows[0],
        stats: stats.rows[0],
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user',
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Toggle user active status (librarian only)
 */
router.put('/:id/status', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await db.query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    await auditLogger.logUpdate(req.user.id, 'users', id, 
      { is_active: !is_active }, 
      { is_active }, 
      req
    );

    res.json({
      status: 'success',
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user status',
    });
  }
});

module.exports = router;