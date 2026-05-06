const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Library Management System API',
      version: '1.0.0',
      description: `A comprehensive RESTful API for managing a digital library system with features including:
        - User authentication and authorization (JWT)
        - Book CRUD operations
        - Booking/borrowing system
        - Analytics and reporting
        - Real-time security monitoring
        - Multi-language support
        - Role-based access control`,
      contact: {
        name: 'Library System Support',
        email: 'support@library.com',
        url: 'https://library.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://library-api.onrender.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: 'User full name' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'librarian'] },
            is_active: { type: 'boolean' },
            avatar_url: { type: 'string' },
            phone: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string', description: 'Book title' },
            author: { type: 'string', description: 'Book author' },
            isbn: { type: 'string', description: 'ISBN number' },
            publisher: { type: 'string' },
            publication_year: { type: 'integer' },
            edition: { type: 'string' },
            language: { type: 'string' },
            description: { type: 'string' },
            category_id: { type: 'integer' },
            total_copies: { type: 'integer' },
            available_copies: { type: 'integer' },
            cover_image: { type: 'string' },
            location: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            book_id: { type: 'integer' },
            issue_date: { type: 'string', format: 'date' },
            due_date: { type: 'string', format: 'date' },
            return_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['borrowed', 'returned', 'overdue', 'lost'] },
            notes: { type: 'string' },
            fine_amount: { type: 'number', format: 'decimal' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints (login, register, password reset)',
      },
      {
        name: 'Books',
        description: 'Book management endpoints (CRUD operations)',
      },
      {
        name: 'Bookings',
        description: 'Booking/borrowing management endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints (admin only)',
      },
      {
        name: 'Analytics',
        description: 'Analytics and statistics endpoints',
      },
      {
        name: 'Reports',
        description: 'Report generation endpoints',
      },
      {
        name: 'Security',
        description: 'Security monitoring and audit logs',
      },
      {
        name: 'Categories',
        description: 'Book category management endpoints',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = swaggerSpecs;