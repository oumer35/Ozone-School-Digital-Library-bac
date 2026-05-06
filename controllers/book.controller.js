const db = require('../config/db');
const auditLogger = require('../utils/auditLogger');

/**
 * Get all books with advanced filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBooks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      author,
      authors,
      isbn,
      publisher,
      year_from,
      year_to,
      available,
      sort_by = 'title',
      sort_order = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT b.*, c.name as category_name,
             COUNT(*) OVER() as total_count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    // Search by title, author, or ISBN
    if (search) {
      paramCount++;
      params.push(`%${search}%`);
      query += ` AND (b.title ILIKE $${paramCount} OR b.author ILIKE $${paramCount} OR b.isbn ILIKE $${paramCount})`;
    }

    // Filter by category
    if (category) {
      paramCount++;
      params.push(category);
      query += ` AND b.category_id = $${paramCount}`;
    }

    // Filter by single author
    if (author) {
      paramCount++;
      params.push(`%${author}%`);
      query += ` AND b.author ILIKE $${paramCount}`;
    }

    // Multi-author filter
    if (authors && authors.length > 0) {
      paramCount++;
      params.push(authors);
      query += ` AND b.author = ANY($${paramCount})`;
    }

    // Filter by ISBN
    if (isbn) {
      paramCount++;
      params.push(isbn);
      query += ` AND b.isbn = $${paramCount}`;
    }

    // Filter by publisher
    if (publisher) {
      paramCount++;
      params.push(`%${publisher}%`);
      query += ` AND b.publisher ILIKE $${paramCount}`;
    }

    // Filter by publication year range
    if (year_from) {
      paramCount++;
      params.push(year_from);
      query += ` AND b.publication_year >= $${paramCount}`;
    }

    if (year_to) {
      paramCount++;
      params.push(year_to);
      query += ` AND b.publication_year <= $${paramCount}`;
    }

    // Filter by availability
    if (available === 'true') {
      query += ` AND b.available_copies > 0`;
    } else if (available === 'false') {
      query += ` AND b.available_copies = 0`;
    }

    // Sorting
    const allowedSortFields = ['title', 'author', 'publication_year', 'available_copies', 'total_copies', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'title';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Pagination
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    query += ` ORDER BY b.${sortField} ${sortDirection} NULLS LAST`;
    query += ` LIMIT $${paramCount - 1} OFFSET $${paramCount}`;

    const result = await db.query(query, params);
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    // Remove total_count from each row
    const books = result.rows.map(row => {
      const { total_count, ...book } = row;
      return book;
    });

    res.json({
      status: 'success',
      data: books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        search: search || null,
        category: category || null,
        author: author || null,
        available: available || null,
      },
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single book by ID with category info
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get book with category and reviews
    const bookResult = await db.query(
      `SELECT b.*, c.name as category_name, c.description as category_description,
              COALESCE(AVG(r.rating)::numeric(10,2), 0) as average_rating,
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN reviews r ON b.id = r.book_id AND r.is_approved = true
       WHERE b.id = $1 AND b.is_active = true
       GROUP BY b.id, c.name, c.description`,
      [id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Book not found',
      });
    }

    // Get recent reviews
    const reviewsResult = await db.query(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = $1 AND r.is_approved = true
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    // Get borrowing history
    const historyResult = await db.query(
      `SELECT bk.*, u.name as user_name
       FROM bookings bk
       JOIN users u ON bk.user_id = u.id
       WHERE bk.book_id = $1
       ORDER BY bk.created_at DESC
       LIMIT 10`,
      [id]
    );

    const book = {
      ...bookResult.rows[0],
      reviews: reviewsResult.rows,
      recent_bookings: historyResult.rows,
    };

    res.json({
      status: 'success',
      data: book,
    });
  } catch (error) {
    console.error('Get book by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching book details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create a new book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBook = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      title,
      author,
      isbn,
      publisher,
      publication_year,
      edition,
      language,
      description,
      category_id,
      total_copies = 1,
      cover_image,
      location,
      keywords,
    } = req.body;

    // Validate required fields
    if (!title || !author) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and author are required',
      });
    }

    // Check if ISBN already exists (if provided)
    if (isbn) {
      const existingISBN = await client.query(
        'SELECT id FROM books WHERE isbn = $1',
        [isbn]
      );
      if (existingISBN.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'A book with this ISBN already exists',
        });
      }
    }

    // Insert book
    const result = await client.query(
      `INSERT INTO books (
        title, author, isbn, publisher, publication_year,
        edition, language, description, category_id,
        total_copies, available_copies, cover_image, location, keywords
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13)
      RETURNING *`,
      [
        title,
        author,
        isbn || null,
        publisher || null,
        publication_year || null,
        edition || null,
        language || 'English',
        description || null,
        category_id || null,
        total_copies,
        cover_image || null,
        location || null,
        keywords || null,
      ]
    );

    const book = result.rows[0];

    // Log audit
    await auditLogger.logCreate(req.user.id, 'books', book.id, book, req);

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Book created successfully',
      data: book,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create book error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'A book with this ISBN already exists',
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error creating book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Update a book
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateBook = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    
    // Check if book exists
    const existingBook = await client.query(
      'SELECT * FROM books WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (existingBook.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Book not found',
      });
    }

    const oldBook = existingBook.rows[0];
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      'title', 'author', 'isbn', 'publisher', 'publication_year',
      'edition', 'language', 'description', 'category_id',
      'total_copies', 'cover_image', 'location', 'keywords', 'is_active'
    ];

    const setClauses = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    }

    // If total_copies is updated, adjust available_copies
    if (updates.total_copies !== undefined) {
      const difference = updates.total_copies - oldBook.total_copies;
      
      // Check if reduction is possible
      if (difference < 0 && oldBook.available_copies + difference < 0) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot reduce total copies. ${Math.abs(difference)} book(s) are currently borrowed.`,
        });
      }
      
      paramCount++;
      setClauses.push(`available_copies = available_copies + $${paramCount}`);
      values.push(difference);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update',
      });
    }

    paramCount++;
    values.push(id);

    const query = `UPDATE books SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, values);

    const updatedBook = result.rows[0];

    // Log audit
    await auditLogger.logUpdate(req.user.id, 'books', id, oldBook, updatedBook, req);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Book updated successfully',
      data: updatedBook,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update book error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'A book with this ISBN already exists',
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error updating book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Delete a book (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteBook = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if book exists
    const book = await client.query(
      'SELECT * FROM books WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (book.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Book not found',
      });
    }

    // Check if book has active bookings
    const activeBookings = await client.query(
      "SELECT COUNT(*) as count FROM bookings WHERE book_id = $1 AND status IN ('borrowed', 'overdue')",
      [id]
    );

    if (parseInt(activeBookings.rows[0].count) > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete book. ${activeBookings.rows[0].count} active booking(s) exist. Return all copies first.`,
      });
    }

    // Soft delete
    await client.query(
      'UPDATE books SET is_active = false WHERE id = $1',
      [id]
    );

    await auditLogger.logDelete(req.user.id, 'books', id, book.rows[0], req);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Book deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete book error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Get book recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get recommendations based on:
    // 1. Books in categories the user has borrowed
    // 2. Popular books the user hasn't borrowed
    // 3. Highly rated books

    const result = await db.query(`
      WITH user_categories AS (
        SELECT DISTINCT b.category_id
        FROM bookings bk
        JOIN books b ON bk.book_id = b.id
        WHERE bk.user_id = $1
      ),
      user_books AS (
        SELECT DISTINCT book_id FROM bookings WHERE user_id = $1
      )
      SELECT b.*, c.name as category_name,
             COUNT(bk.id) as borrow_count,
             COALESCE(AVG(r.rating)::numeric(10,2), 0) as avg_rating
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN bookings bk ON b.id = bk.book_id
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.is_active = true
        AND b.available_copies > 0
        AND b.id NOT IN (SELECT book_id FROM user_books)
        AND (
          b.category_id IN (SELECT category_id FROM user_categories)
          OR b.id IN (
            SELECT book_id FROM bookings 
            GROUP BY book_id 
            ORDER BY COUNT(*) DESC 
            LIMIT 10
          )
        )
      GROUP BY b.id, c.name
      ORDER BY 
        CASE WHEN b.category_id IN (SELECT category_id FROM user_categories) THEN 1 ELSE 2 END,
        borrow_count DESC,
        avg_rating DESC
      LIMIT 10
    `, [userId]);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching recommendations',
    });
  }
};

/**
 * Predict book demand
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.predictDemand = async (req, res) => {
  try {
    const result = await db.query(`
      WITH monthly_stats AS (
        SELECT 
          b.id,
          b.title,
          b.author,
          b.available_copies,
          b.total_copies,
          c.name as category_name,
          COUNT(bk.id) as total_borrows,
          COUNT(CASE WHEN bk.issue_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_borrows,
          COUNT(CASE WHEN bk.status = 'borrowed' THEN 1 END) as currently_borrowed
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN bookings bk ON b.id = bk.book_id
        WHERE b.is_active = true
        GROUP BY b.id, b.title, b.author, b.available_copies, b.total_copies, c.name
      )
      SELECT *,
        CASE 
          WHEN currently_borrowed >= total_copies * 0.8 THEN 'High'
          WHEN currently_borrowed >= total_copies * 0.5 THEN 'Medium'
          ELSE 'Low'
        END as demand_level,
        CASE
          WHEN available_copies = 0 THEN 'Out of Stock'
          WHEN available_copies <= 2 THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status
      FROM monthly_stats
      ORDER BY recent_borrows DESC, total_borrows DESC
      LIMIT 20
    `);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Predict demand error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error predicting demand',
    });
  }
};

module.exports = exports;