const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     tags: [Reports]
 *     summary: Get system summary report
 */
router.get('/summary', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM books WHERE is_active = true) as total_books,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'borrowed') as active_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'overdue') as overdue_bookings,
        (SELECT COALESCE(SUM(fine_amount), 0) FROM bookings) as total_fines,
        (SELECT COUNT(*) FROM categories WHERE is_active = true) as total_categories
    `);

    res.json({
      status: 'success',
      data: stats.rows[0],
    });
  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating summary report',
    });
  }
});

/**
 * @swagger
 * /api/reports/bookings:
 *   get:
 *     tags: [Reports]
 *     summary: Get detailed booking report
 */
router.get('/bookings', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;

    let query = `
      SELECT 
        bk.id,
        u.name as user_name,
        u.email as user_email,
        b.title as book_title,
        b.author as book_author,
        bk.issue_date,
        bk.due_date,
        bk.return_date,
        bk.status,
        bk.fine_amount,
        CASE 
          WHEN bk.return_date > bk.due_date THEN 'Yes'
          ELSE 'No'
        END as was_overdue
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN books b ON bk.book_id = b.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (from_date) {
      paramCount++;
      params.push(from_date);
      query += ` AND bk.issue_date >= $${paramCount}`;
    }

    if (to_date) {
      paramCount++;
      params.push(to_date);
      query += ` AND bk.issue_date <= $${paramCount}`;
    }

    if (status) {
      paramCount++;
      params.push(status);
      query += ` AND bk.status = $${paramCount}`;
    }

    query += ' ORDER BY bk.issue_date DESC';

    const result = await db.query(query, params);

    res.json({
      status: 'success',
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating booking report',
    });
  }
});

module.exports = router;