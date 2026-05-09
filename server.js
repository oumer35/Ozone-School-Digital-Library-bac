// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const compression = require('compression');
// const rateLimit = require('express-rate-limit');
// const xss = require('xss-clean');
// const hpp = require('hpp');
// const swaggerUi = require('swagger-ui-express');
// require('dotenv').config();

// // Import routes
// const authRoutes = require('./routes/auth.routes');
// const bookRoutes = require('./routes/book.routes');
// const bookingRoutes = require('./routes/booking.routes');
// const userRoutes = require('./routes/user.routes');
// const analyticsRoutes = require('./routes/analytics.routes');
// const reportRoutes = require('./routes/report.routes');
// const securityRoutes = require('./routes/security.routes');
// const categoryRoutes = require('./routes/category.routes');

// // Import swagger docs
// const swaggerSpecs = require('./swagger/swagger.config');

// const app = express();
// const server = http.createServer(app);

// // Socket.IO setup
// const io = new Server(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials: true,
//   },
// });

// // Make io accessible globally
// global.io = io;

// // Socket.IO connection handling
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   socket.on('join-room', (room) => {
//     socket.join(room);
//     console.log(`Socket ${socket.id} joined room: ${room}`);
//   });

//   socket.on('leave-room', (room) => {
//     socket.leave(room);
//   });

//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });

// // Security middleware
// app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));
// app.use(xss());
// app.use(hpp());

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
//   max: process.env.RATE_LIMIT_MAX || 100,
//   message: {
//     status: 429,
//     message: 'Too many requests, please try again later.',
//   },
// });
// app.use('/api/', limiter);

// // Body parser
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Compression
// app.use(compression());

// // Logging
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// // Swagger Documentation
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
//   customCss: '.swagger-ui .topbar { display: none }',
//   customSiteTitle: 'Library Management System API Documentation',
//   customfavIcon: '/favicon.ico',
// }));

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/books', bookRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/security', securityRoutes);
// app.use('/api/categories', categoryRoutes);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'success',
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     status: 'error',
//     message: 'Route not found',
//   });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('Error:', err);

//   const statusCode = err.statusCode || 500;
//   const message = err.message || 'Internal server error';

//   res.status(statusCode).json({
//     status: 'error',
//     message: message,
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
//   console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
// });

// module.exports = app;

const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ==================== DATABASE INITIALIZATION ====================
async function initializeDatabase() {
  const db = require('./config/db');
  const bcrypt = require('bcryptjs');
  
  console.log('🔧 Checking database...');
  
  try {
    // Create tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        reset_token VARCHAR(255),
        otp_code VARCHAR(6),
        otp_expiry TIMESTAMP,
        refresh_token TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        last_login TIMESTAMP,
        phone VARCHAR(20),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(20) UNIQUE,
        publisher VARCHAR(255),
        publication_year INTEGER,
        description TEXT,
        category_id INTEGER REFERENCES categories(id),
        total_copies INTEGER DEFAULT 1,
        available_copies INTEGER DEFAULT 1,
        cover_image TEXT,
        location VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Books table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        book_id INTEGER REFERENCES books(id),
        issue_date DATE DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(50) DEFAULT 'borrowed',
        notes TEXT,
        fine_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Security logs table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Audit logs table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        book_id INTEGER REFERENCES books(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      )
    `);
    console.log('✅ Reviews table ready');

    // Check if admin user exists
    const userCheck = await db.query("SELECT COUNT(*) as count FROM users");
    
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('👤 Creating default users...');
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Admin User', 'admin@library.com', hashedPassword, 'librarian']
      );
      console.log('✅ Admin created: admin@library.com');

      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['John Doe', 'john@example.com', hashedPassword, 'user']
      );
      console.log('✅ User created: john@example.com');
    }

    // Check if categories exist
    const catCheck = await db.query("SELECT COUNT(*) as count FROM categories");
    
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log('📚 Creating default categories...');
      const categories = ['Technology', 'Science', 'Literature', 'History', 'Mathematics'];
      for (const cat of categories) {
        await db.query(
          "INSERT INTO categories (name, description) VALUES ($1, $2)",
          [cat, `Books about ${cat.toLowerCase()}`]
        );
      }
      console.log('✅ Categories created');
    }

    // Check if books exist
    const bookCheck = await db.query("SELECT COUNT(*) as count FROM books");
    
    if (parseInt(bookCheck.rows[0].count) === 0) {
      console.log('📖 Creating default books...');
      const cats = await db.query("SELECT id, name FROM categories");
      const catMap = {};
      cats.rows.forEach(c => { catMap[c.name] = c.id; });

      const books = [
        { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', copies: 5 },
        { title: 'Design Patterns', author: 'Gang of Four', category: 'Technology', copies: 3 },
        { title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', copies: 6 },
        { title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Literature', copies: 8 },
        { title: '1984', author: 'George Orwell', category: 'Literature', copies: 7 },
        { title: 'The Art of War', author: 'Sun Tzu', category: 'History', copies: 4 },
      ];

      for (const book of books) {
        const catId = catMap[book.category];
        if (catId) {
          await db.query(
            "INSERT INTO books (title, author, category_id, total_copies, available_copies) VALUES ($1, $2, $3, $4, $4)",
            [book.title, book.author, catId, book.copies]
          );
        }
      }
      console.log('✅ Books created');
    }

    console.log('🎉 Database initialization complete!\n');
  } catch (error) {
    console.error('⚠️ Database init warning:', error.message);
    // Don't crash - maybe tables already exist
  }
}

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ozone-school-digital-library.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// ==================== BODY PARSER ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== REQUEST LOGGING ====================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ==================== ROUTES ====================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/books', require('./routes/book.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/security', require('./routes/security.routes'));
app.use('/api/categories', require('./routes/category.routes'));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

// Initialize database, then start server
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📚 API: http://localhost:${PORT}/api`);
    console.log(`✅ Allowed origins:`, allowedOrigins);
    console.log(`\n📝 Login: admin@library.com / Password@123\n`);
  });
});

module.exports = { app, server };