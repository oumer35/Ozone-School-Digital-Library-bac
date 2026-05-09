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

// ==================== CORS CONFIGURATION ====================
// MUST be before routes and after body parser
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ozone-school-digital-library.vercel.app',     // WITHOUT trailing slash!
  'https://ozone-school-digital-library.vercel.app/',    // WITH trailing slash
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(null, true); // TEMPORARILY allow all for debugging
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

// ==================== BODY PARSER ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ==================== OPTIONAL SOCKET.IO ====================
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  global.io = io;
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
  });
} catch (error) {
  console.log('Socket.io not available, continuing without real-time alerts');
}

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origins: allowedOrigins,
  });
});

// ==================== ERROR HANDLERS ====================
app.use('/api/*', (req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
  console.log(`✅ CORS enabled for:`, allowedOrigins);
  console.log(`\nRegistered routes:`);
  console.log(`  POST /api/auth/login`);
  console.log(`  POST /api/auth/register`);
  console.log(`  GET  /api/books`);
  console.log(`  GET  /api/categories`);
  console.log(`  GET  /api/analytics/dashboard`);
  console.log(`\n`);
});

module.exports = { app, server, io };