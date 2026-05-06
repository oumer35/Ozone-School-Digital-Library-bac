// const express = require('express');
// const router = express.Router();
// const db = require('../config/db');
// const { authenticate } = require('../middleware/auth');
// const { authorize } = require('../middleware/role');
// const { bookRules, validate } = require('../middleware/validate');
// const auditLogger = require('../utils/auditLogger');

// /**
//  * @swagger
//  * /api/books:
//  *   get:
//  *     tags: [Books]
//  *     summary: Get all books with pagination and filters
//  *     parameters:
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *       - in: query
//  *         name: search
//  *         schema:
//  *           type: string
//  *       - in: query
//  *         name: category
//  *         schema:
//  *           type: integer
//  *       - in: query
//  *         name: author
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: List of books
//  */
// router.get('/', authenticate, async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 10, 
//       search, 
//       category, 
//       author,
//       sort_by = 'title',
//       sort_order = 'ASC'
//     } = req.query;

//     const offset = (page - 1) * limit;
    
//     let query = `
//       SELECT b.*, c.name as category_name,
//              COUNT(*) OVER() as total_count
//       FROM books b
//       LEFT JOIN categories c ON b.category_id = c.id
//       WHERE b.is_active = true
//     `;
    
//     const params = [];
//     let paramCount = 0;

//     if (search) {
//       paramCount++;
//       params.push(`%${search}%`);
//       query += ` AND (b.title ILIKE $${paramCount} OR b.author ILIKE $${paramCount} OR b.isbn ILIKE $${paramCount})`;
//     }

//     if (category) {
//       paramCount++;
//       params.push(category);
//       query += ` AND b.category_id = $${paramCount}`;
//     }

//     if (author) {
//       paramCount++;
//       params.push(`%${author}%`);
//       query += ` AND b.author ILIKE $${paramCount}`;
//     }

//     // Validate sort parameters
//     const allowedSorts = ['title', 'author', 'publication_year', 'available_copies', 'created_at'];
//     const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'title';
//     const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

//     paramCount++;
//     params.push(limit);
//     paramCount++;
//     params.push(offset);

//     query += ` ORDER BY b.${sortColumn} ${sortDirection} LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

//     const result = await db.query(query, params);
    
//     const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

//     res.json({
//       status: 'success',
//       data: result.rows.map(row => {
//         const { total_count, ...book } = row;
//         return book;
//       }),
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total: totalCount,
//         pages: Math.ceil(totalCount / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Get books error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error fetching books',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/books/search:
//  *   get:
//  *     tags: [Books]
//  *     summary: Advanced book search with multiple filters
//  */
// router.get('/search', authenticate, async (req, res) => {
//   try {
//     const { title, author, category, isbn, publisher, year_from, year_to, available } = req.query;

//     let query = `
//       SELECT b.*, c.name as category_name
//       FROM books b
//       LEFT JOIN categories c ON b.category_id = c.id
//       WHERE b.is_active = true
//     `;
//     const params = [];
//     let paramCount = 0;

//     if (title) {
//       paramCount++;
//       params.push(`%${title}%`);
//       query += ` AND b.title ILIKE $${paramCount}`;
//     }

//     if (author) {
//       paramCount++;
//       params.push(`%${author}%`);
//       query += ` AND b.author ILIKE $${paramCount}`;
//     }

//     if (category) {
//       paramCount++;
//       params.push(category);
//       query += ` AND b.category_id = $${paramCount}`;
//     }

//     if (isbn) {
//       paramCount++;
//       params.push(isbn);
//       query += ` AND b.isbn = $${paramCount}`;
//     }

//     if (publisher) {
//       paramCount++;
//       params.push(`%${publisher}%`);
//       query += ` AND b.publisher ILIKE $${paramCount}`;
//     }

//     if (year_from) {
//       paramCount++;
//       params.push(year_from);
//       query += ` AND b.publication_year >= $${paramCount}`;
//     }

//     if (year_to) {
//       paramCount++;
//       params.push(year_to);
//       query += ` AND b.publication_year <= $${paramCount}`;
//     }

//     if (available === 'true') {
//       query += ` AND b.available_copies > 0`;
//     }

//     query += ' ORDER BY b.title ASC';

//     const result = await db.query(query, params);

//     res.json({
//       status: 'success',
//       data: result.rows,
//       count: result.rows.length,
//     });
//   } catch (error) {
//     console.error('Search books error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error searching books',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/books/{id}:
//  *   get:
//  *     tags: [Books]
//  *     summary: Get a single book by ID
//  */
// router.get('/:id', authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const result = await db.query(
//       `SELECT b.*, c.name as category_name,
//               COALESCE(AVG(r.rating), 0) as average_rating,
//               COUNT(r.id) as review_count
//        FROM books b
//        LEFT JOIN categories c ON b.category_id = c.id
//        LEFT JOIN reviews r ON b.id = r.book_id AND r.is_approved = true
//        WHERE b.id = $1
//        GROUP BY b.id, c.name`,
//       [id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Book not found',
//       });
//     }

//     res.json({
//       status: 'success',
//       data: result.rows[0],
//     });
//   } catch (error) {
//     console.error('Get book error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error fetching book',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/books:
//  *   post:
//  *     tags: [Books]
//  *     summary: Create a new book (librarian only)
//  */
// router.post('/', authenticate, authorize('librarian'), bookRules, validate, async (req, res) => {
//   try {
//     const {
//       title, author, isbn, publisher, publication_year,
//       edition, language, description, category_id,
//       total_copies, cover_image, location, keywords
//     } = req.body;

//     const result = await db.query(
//       `INSERT INTO books (
//         title, author, isbn, publisher, publication_year,
//         edition, language, description, category_id,
//         total_copies, available_copies, cover_image, location, keywords
//       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13)
//       RETURNING *`,
//       [title, author, isbn, publisher, publication_year,
//        edition, language, description, category_id,
//        total_copies || 1, cover_image, location, keywords]
//     );

//     const book = result.rows[0];

//     await auditLogger.logCreate(req.user.id, 'books', book.id, book, req);

//     res.status(201).json({
//       status: 'success',
//       message: 'Book created successfully',
//       data: book,
//     });
//   } catch (error) {
//     console.error('Create book error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error creating book',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/books/{id}:
//  *   put:
//  *     tags: [Books]
//  *     summary: Update a book (librarian only)
//  */
// router.put('/:id', authenticate, authorize('librarian'), async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // Get existing book
//     const existingBook = await db.query('SELECT * FROM books WHERE id = $1', [id]);
//     if (existingBook.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Book not found',
//       });
//     }

//     const oldBook = existingBook.rows[0];
//     const updates = req.body;
    
//     // Build dynamic update query
//     const allowedFields = [
//       'title', 'author', 'isbn', 'publisher', 'publication_year',
//       'edition', 'language', 'description', 'category_id',
//       'total_copies', 'location', 'keywords', 'is_active'
//     ];
    
//     const setClauses = [];
//     const values = [];
//     let paramCount = 0;

//     for (const [key, value] of Object.entries(updates)) {
//       if (allowedFields.includes(key)) {
//         paramCount++;
//         setClauses.push(`${key} = $${paramCount}`);
//         values.push(value);
//       }
//     }

//     if (setClauses.length === 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'No valid fields to update',
//       });
//     }

//     // If total_copies is being updated, adjust available_copies
//     if (updates.total_copies) {
//       const difference = updates.total_copies - oldBook.total_copies;
//       paramCount++;
//       setClauses.push(`available_copies = available_copies + $${paramCount}`);
//       values.push(difference);
//     }

//     paramCount++;
//     values.push(id);

//     const query = `UPDATE books SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;
//     const result = await db.query(query, values);

//     const updatedBook = result.rows[0];

//     await auditLogger.logUpdate(req.user.id, 'books', id, oldBook, updatedBook, req);

//     res.json({
//       status: 'success',
//       message: 'Book updated successfully',
//       data: updatedBook,
//     });
//   } catch (error) {
//     console.error('Update book error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error updating book',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/books/{id}:
//  *   delete:
//  *     tags: [Books]
//  *     summary: Delete a book (librarian only)
//  */
// router.delete('/:id', authenticate, authorize('librarian'), async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if book exists
//     const book = await db.query('SELECT * FROM books WHERE id = $1', [id]);
//     if (book.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Book not found',
//       });
//     }

//     // Check if book has active bookings
//     const activeBookings = await db.query(
//       "SELECT COUNT(*) FROM bookings WHERE book_id = $1 AND status = 'borrowed'",
//       [id]
//     );

//     if (parseInt(activeBookings.rows[0].count) > 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Cannot delete book with active bookings',
//       });
//     }

//     // Soft delete (set inactive)
//     await db.query(
//       'UPDATE books SET is_active = false WHERE id = $1',
//       [id]
//     );

//     await auditLogger.logDelete(req.user.id, 'books', id, book.rows[0], req);

//     res.json({
//       status: 'success',
//       message: 'Book deleted successfully',
//     });
//   } catch (error) {
//     console.error('Delete book error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error deleting book',
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { bookRules, validate } = require('../middleware/validate');

// Public routes (require authentication but not admin)
router.get('/', authenticate, bookController.getBooks);
router.get('/search', authenticate, bookController.getBooks); // Search uses same handler
router.get('/recommend/:userId', authenticate, bookController.getRecommendations);
router.get('/predict-demand', authenticate, bookController.predictDemand);
router.get('/:id', authenticate, bookController.getBookById);

// Admin only routes
router.post('/', authenticate, authorize('librarian'), bookRules, validate, bookController.createBook);
router.put('/:id', authenticate, authorize('librarian'), bookController.updateBook);
router.delete('/:id', authenticate, authorize('librarian'), bookController.deleteBook);

module.exports = router;