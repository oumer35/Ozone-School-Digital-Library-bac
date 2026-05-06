const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

/**
 * @swagger
 * /api/analytics/monthly:
 *   get:
 *     tags: [Analytics]
 *     summary: Get monthly booking statistics
 */
router.get('/monthly', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const result = await db.query(`
      SELECT 
        TO_CHAR(issue_date, 'YYYY-MM') AS month,
        COUNT(*) AS total_bookings,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue
      FROM bookings
      WHERE issue_date >= CURRENT_DATE - INTERVAL '1 month' * $1
      GROUP BY month
      ORDER BY month ASC
    `, [months]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Monthly analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching monthly analytics',
    });
  }
});

/**
 * @swagger
 * /api/analytics/top-books:
 *   get:
 *     tags: [Analytics]
 *     summary: Get most borrowed books
 */
router.get('/top-books', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.author,
        COUNT(bk.id) AS total_borrows,
        COUNT(CASE WHEN bk.status = 'borrowed' THEN 1 END) as currently_borrowed
      FROM books b
      LEFT JOIN bookings bk ON b.id = bk.book_id
      GROUP BY b.id, b.title, b.author
      ORDER BY total_borrows DESC
      LIMIT $1
    `, [limit]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Top books error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching top books',
    });
  }
});

/**
 * @swagger
 * /api/analytics/top-users:
 *   get:
 *     tags: [Analytics]
 *     summary: Get most active users
 */
router.get('/top-users', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(bk.id) AS total_bookings,
        COUNT(CASE WHEN bk.status = 'borrowed' THEN 1 END) as active_bookings
      FROM users u
      LEFT JOIN bookings bk ON u.id = bk.user_id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_bookings DESC
      LIMIT $1
    `, [limit]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Top users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching top users',
    });
  }
});

/**
 * @swagger
 * /api/analytics/category-popularity:
 *   get:
 *     tags: [Analytics]
 *     summary: Get category popularity statistics
 */
router.get('/category-popularity', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(bk.id) AS total_borrows,
        COUNT(DISTINCT b.id) as unique_books
      FROM categories c
      JOIN books b ON c.id = b.category_id
      LEFT JOIN bookings bk ON b.id = bk.book_id
      GROUP BY c.id, c.name
      ORDER BY total_borrows DESC
    `);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Category popularity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching category popularity',
    });
  }
});

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard summary statistics
 */
router.get('/dashboard', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const [totalBooks, totalUsers, totalBookings, activeBookings, overdueBookings] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM books WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM bookings'),
      db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'borrowed'"),
      db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'overdue'"),
    ]);

    // Get recent activities
    const recentBookings = await db.query(`
      SELECT bk.*, u.name as user_name, b.title as book_title
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN books b ON bk.book_id = b.id
      ORDER BY bk.created_at DESC
      LIMIT 5
    `);

    // Get popular books this month
    const popularBooks = await db.query(`
      SELECT b.title, b.author, COUNT(bk.id) as borrows
      FROM books b
      JOIN bookings bk ON b.id = bk.book_id
      WHERE bk.issue_date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY b.id, b.title, b.author
      ORDER BY borrows DESC
      LIMIT 5
    `);

    res.json({
      status: 'success',
      data: {
        summary: {
          total_books: parseInt(totalBooks.rows[0].count),
          total_users: parseInt(totalUsers.rows[0].count),
          total_bookings: parseInt(totalBookings.rows[0].count),
          active_bookings: parseInt(activeBookings.rows[0].count),
          overdue_bookings: parseInt(overdueBookings.rows[0].count),
        },
        recent_bookings: recentBookings.rows,
        popular_books: popularBooks.rows,
      },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard analytics',
    });
  }
});

module.exports = router;