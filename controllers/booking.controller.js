const db = require('../config/db');
const auditLogger = require('../utils/auditLogger');

/**
 * Get all bookings with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      user_id, 
      book_id,
      from_date,
      to_date,
      overdue
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT bk.*, 
             u.name as user_name, u.email as user_email,
             b.title as book_title, b.author as book_author,
             b.isbn as book_isbn,
             COUNT(*) OVER() as total_count,
             CASE 
               WHEN bk.status = 'borrowed' AND bk.due_date < CURRENT_DATE THEN true
               ELSE false
             END as is_overdue
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN books b ON bk.book_id = b.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Users can only see their own bookings
    if (req.user.role !== 'librarian') {
      paramCount++;
      params.push(req.user.id);
      query += ` AND bk.user_id = $${paramCount}`;
    } else if (user_id) {
      paramCount++;
      params.push(user_id);
      query += ` AND bk.user_id = $${paramCount}`;
    }

    // Filter by book
    if (book_id) {
      paramCount++;
      params.push(book_id);
      query += ` AND bk.book_id = $${paramCount}`;
    }

    // Filter by status
    if (status) {
      paramCount++;
      params.push(status);
      query += ` AND bk.status = $${paramCount}`;
    }

    // Filter by date range
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

    // Filter overdue
    if (overdue === 'true') {
      query += ` AND bk.status = 'borrowed' AND bk.due_date < CURRENT_DATE`;
    }

    // Pagination
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    query += ` ORDER BY bk.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

    const result = await db.query(query, params);
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    const bookings = result.rows.map(row => {
      const { total_count, ...booking } = row;
      return booking;
    });

    res.json({
      status: 'success',
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      summary: {
        total: totalCount,
        borrowed: bookings.filter(b => b.status === 'borrowed').length,
        returned: bookings.filter(b => b.status === 'returned').length,
        overdue: bookings.filter(b => b.status === 'overdue' || b.is_overdue).length,
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single booking by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT bk.*, 
              u.name as user_name, u.email as user_email, u.phone as user_phone,
              b.title as book_title, b.author as book_author, b.isbn as book_isbn,
              b.cover_image as book_cover
       FROM bookings bk
       JOIN users u ON bk.user_id = u.id
       JOIN books b ON bk.book_id = b.id
       WHERE bk.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    const booking = result.rows[0];

    // Check if user has access
    if (req.user.role !== 'librarian' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    res.json({
      status: 'success',
      data: booking,
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking details',
    });
  }
};

/**
 * Create a new booking (borrow a book)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBooking = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { book_id, days = 14 } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!book_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Book ID is required',
      });
    }

    if (days < 1 || days > 30) {
      return res.status(400).json({
        status: 'error',
        message: 'Borrowing period must be between 1 and 30 days',
      });
    }

    // Check if book exists and is available
    const bookResult = await client.query(
      'SELECT * FROM books WHERE id = $1 AND is_active = true FOR UPDATE',
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Book not found or unavailable',
      });
    }

    const book = bookResult.rows[0];

    if (book.available_copies <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No copies available for this book',
      });
    }

    // Check if user already has this book borrowed
    const existingBooking = await client.query(
      `SELECT id FROM bookings 
       WHERE user_id = $1 AND book_id = $2 AND status IN ('borrowed', 'overdue')`,
      [user_id, book_id]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have this book borrowed. Return it first.',
      });
    }

    // Check user's active bookings limit
    const activeBookings = await client.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE user_id = $1 AND status IN ('borrowed', 'overdue')`,
      [user_id]
    );

    const maxBookings = req.user.role === 'librarian' ? 10 : 5;

    if (parseInt(activeBookings.rows[0].count) >= maxBookings) {
      return res.status(400).json({
        status: 'error',
        message: `You have reached the maximum number of active bookings (${maxBookings})`,
      });
    }

    // Check for overdue books
    const overdueBooks = await client.query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE user_id = $1 AND status = 'borrowed' AND due_date < CURRENT_DATE`,
      [user_id]
    );

    if (parseInt(overdueBooks.rows[0].count) > 0 && req.user.role !== 'librarian') {
      return res.status(400).json({
        status: 'error',
        message: 'You have overdue books. Return them before borrowing new ones.',
      });
    }

    // Create booking
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, book_id, issue_date, due_date, status)
       VALUES ($1, $2, $3, $4, 'borrowed')
       RETURNING *`,
      [user_id, book_id, issueDate, dueDate]
    );

    // Update available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    const booking = bookingResult.rows[0];

    // Log audit
    await auditLogger.logCreate(req.user.id, 'bookings', booking.id, {
      ...booking,
      book_title: book.title,
    }, req);

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Book borrowed successfully',
      data: {
        ...booking,
        book_title: book.title,
        book_author: book.author,
        due_date: dueDate,
        days_borrowed: days,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Return a book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.returnBook = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if booking exists
    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }

    const booking = bookingResult.rows[0];

    // Check authorization
    if (req.user.role !== 'librarian' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only return your own books',
      });
    }

    // Check if already returned
    if (booking.status === 'returned') {
      return res.status(400).json({
        status: 'error',
        message: 'This book has already been returned',
      });
    }

    // Calculate fine if overdue
    const dueDate = new Date(booking.due_date);
    const returnDate = new Date();
    let fine = 0;
    let daysLate = 0;

    if (returnDate > dueDate) {
      daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * 1.00; // $1 per day
    }

    // Update booking
    const updateResult = await client.query(
      `UPDATE bookings 
       SET return_date = $1, 
           status = 'returned', 
           fine_amount = $2
       WHERE id = $3
       RETURNING *`,
      [returnDate, fine, id]
    );

    // Update available copies
    await client.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [booking.book_id]
    );

    const updatedBooking = updateResult.rows[0];

    // Log audit
    await auditLogger.logUpdate(
      req.user.id, 
      'bookings', 
      id, 
      booking, 
      updatedBooking, 
      req
    );

    await client.query('COMMIT');

    const responseData = {
      ...updatedBooking,
      days_late: daysLate,
      late_fee: fine,
    };

    res.json({
      status: 'success',
      message: fine > 0 
        ? `Book returned successfully with $${fine} late fee (${daysLate} days late)` 
        : 'Book returned successfully',
      data: responseData,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Return book error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error returning book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Get user's booking statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserBookingStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_bookings,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_bookings,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_bookings,
        COUNT(CASE WHEN return_date > due_date THEN 1 END) as late_returns,
        COALESCE(SUM(fine_amount), 0) as total_fines
       FROM bookings 
       WHERE user_id = $1`,
      [userId]
    );

    const recentBooks = await db.query(
      `SELECT b.title, b.author, bk.issue_date, bk.status
       FROM bookings bk
       JOIN books b ON bk.book_id = b.id
       WHERE bk.user_id = $1
       ORDER BY bk.created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      status: 'success',
      data: {
        stats: stats.rows[0],
        recent_books: recentBooks.rows,
      },
    });
  } catch (error) {
    console.error('Get user booking stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching booking statistics',
    });
  }
};

module.exports = exports;