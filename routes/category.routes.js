const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const auditLogger = require('../utils/auditLogger');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id AND b.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching categories',
    });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category (librarian only)
 */
router.post('/', authenticate, authorize('librarian'), async (req, res) => {
  try {
    const { name, description, image_url } = req.body;

    const result = await db.query(
      `INSERT INTO categories (name, description, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, image_url]
    );

    await auditLogger.logCreate(req.user.id, 'categories', result.rows[0].id, result.rows[0], req);

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating category',
    });
  }
});

module.exports = router;