// const express = require('express');
// const router = express.Router();
// const db = require('../config/db');
// const { authenticate } = require('../middleware/auth');
// const { authorize } = require('../middleware/role');
// const { bookingRules, validate } = require('../middleware/validate');
// const auditLogger = require('../utils/auditLogger');

// /**
//  * @swagger
//  * /api/bookings:
//  *   get:
//  *     tags: [Bookings]
//  *     summary: Get all bookings
//  */
// router.get('/', authenticate, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, user_id } = req.query;
//     const offset = (page - 1) * limit;

//     let query = `
//       SELECT bk.*, 
//              u.name as user_name, u.email as user_email,
//              b.title as book_title, b.author as book_author,
//              COUNT(*) OVER() as total_count
//       FROM bookings bk
//       JOIN users u ON bk.user_id = u.id
//       JOIN books b ON bk.book_id = b.id
//       WHERE 1=1
//     `;
    
//     const params = [];
//     let paramCount = 0;

//     // Librarian sees all, users see only their bookings
//     if (req.user.role !== 'librarian') {
//       paramCount++;
//       params.push(req.user.id);
//       query += ` AND bk.user_id = $${paramCount}`;
//     } else if (user_id) {
//       paramCount++;
//       params.push(user_id);
//       query += ` AND bk.user_id = $${paramCount}`;
//     }

//     if (status) {
//       paramCount++;
//       params.push(status);
//       query += ` AND bk.status = $${paramCount}`;
//     }

//     paramCount++;
//     params.push(limit);
//     paramCount++;
//     params.push(offset);

//     query += ` ORDER BY bk.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

//     const result = await db.query(query, params);
//     const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

//     res.json({
//       status: 'success',
//       data: result.rows.map(row => {
//         const { total_count, ...booking } = row;
//         return booking;
//       }),
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total: totalCount,
//         pages: Math.ceil(totalCount / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Get bookings error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error fetching bookings',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/bookings:
//  *   post:
//  *     tags: [Bookings]
//  *     summary: Create a new booking
//  */
// router.post('/', authenticate, bookingRules, validate, async (req, res) => {
//   try {
//     const { book_id, days = 14 } = req.body;
//     const user_id = req.user.id;

//     // Check if book exists and is available
//     const bookResult = await db.query(
//       'SELECT * FROM books WHERE id = $1 AND is_active = true',
//       [book_id]
//     );

//     if (bookResult.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Book not found or unavailable',
//       });
//     }

//     const book = bookResult.rows[0];

//     if (book.available_copies <= 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'No copies available for this book',
//       });
//     }

//     // Check if user already has this book
//     const existingBooking = await db.query(
//       "SELECT id FROM bookings WHERE user_id = $1 AND book_id = $2 AND status = 'borrowed'",
//       [user_id, book_id]
//     );

//     if (existingBooking.rows.length > 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'You already have this book borrowed',
//       });
//     }

//     // Check user's active bookings limit
//     const activeBookings = await db.query(
//       "SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status = 'borrowed'",
//       [user_id]
//     );

//     if (parseInt(activeBookings.rows[0].count) >= 5) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'You have reached the maximum number of active bookings (5)',
//       });
//     }

//     // Create booking
//     const issueDate = new Date();
//     const dueDate = new Date();
//     dueDate.setDate(dueDate.getDate() + days);

//     const result = await db.query(
//       `INSERT INTO bookings (user_id, book_id, issue_date, due_date, status)
//        VALUES ($1, $2, $3, $4, 'borrowed')
//        RETURNING *`,
//       [user_id, book_id, issueDate, dueDate]
//     );

//     // Update available copies
//     await db.query(
//       'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
//       [book_id]
//     );

//     const booking = result.rows[0];

//     await auditLogger.logCreate(req.user.id, 'bookings', booking.id, booking, req);

//     res.status(201).json({
//       status: 'success',
//       message: 'Book borrowed successfully',
//       data: {
//         ...booking,
//         book_title: book.title,
//         due_date: dueDate,
//       },
//     });
//   } catch (error) {
//     console.error('Create booking error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error creating booking',
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/bookings/{id}/return:
//  *   put:
//  *     tags: [Bookings]
//  *     summary: Return a borrowed book
//  */
// router.put('/:id/return', authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if booking exists
//     const bookingResult = await db.query(
//       'SELECT * FROM bookings WHERE id = $1',
//       [id]
//     );

//     if (bookingResult.rows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Booking not found',
//       });
//     }

//     const booking = bookingResult.rows[0];

//     // Check if user owns this booking or is librarian
//     if (req.user.role !== 'librarian' && booking.user_id !== req.user.id) {
//       return res.status(403).json({
//         status: 'error',
//         message: 'You can only return your own books',
//       });
//     }

//     if (booking.status !== 'borrowed' && booking.status !== 'overdue') {
//       return res.status(400).json({
//         status: 'error',
//         message: 'This book has already been returned',
//       });
//     }

//     // Calculate fine if overdue
//     const dueDate = new Date(booking.due_date);
//     const returnDate = new Date();
//     let fine = 0;
//     let status = 'returned';

//     if (returnDate > dueDate) {
//       const daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
//       fine = daysLate * 1.00; // $1 per day late
//       status = 'returned'; // Could be 'returned' even if late
//     }

//     // Update booking
//     const result = await db.query(
//       `UPDATE bookings 
//        SET return_date = $1, status = $2, fine_amount = $3
//        WHERE id = $4
//        RETURNING *`,
//       [returnDate, status, fine, id]
//     );

//     // Update available copies
//     await db.query(
//       'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
//       [booking.book_id]
//     );

//     const updatedBooking = result.rows[0];

//     await auditLogger.logUpdate(req.user.id, 'bookings', id, booking, updatedBooking, req);

//     res.json({
//       status: 'success',
//       message: fine > 0 ? `Book returned with $${fine} late fee` : 'Book returned successfully',
//       data: {
//         ...updatedBooking,
//         late_fee: fine,
//         days_late: fine > 0 ? Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)) : 0,
//       },
//     });
//   } catch (error) {
//     console.error('Return book error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Error returning book',
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { bookingRules, validate } = require('../middleware/validate');

// All booking routes require authentication
router.get('/', authenticate, bookingController.getBookings);
router.get('/stats/:userId?', authenticate, bookingController.getUserBookingStats);
router.get('/:id', authenticate, bookingController.getBookingById);

// Create booking (borrow a book)
router.post('/', authenticate, bookingRules, validate, bookingController.createBooking);

// Return a book
router.put('/:id/return', authenticate, bookingController.returnBook);

module.exports = router;