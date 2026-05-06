// const db = require('../config/db');
// const bcrypt = require('bcryptjs');
// require('dotenv').config();

// const seedDatabase = async () => {
//   console.log('🌱 Starting database seeding...');
  
//   try {
//     // Clear existing data
//     await db.query('DELETE FROM audit_logs');
//     await db.query('DELETE FROM security_logs');
//     await db.query('DELETE FROM reviews');
//     await db.query('DELETE FROM bookings');
//     await db.query('DELETE FROM books');
//     await db.query('DELETE FROM categories');
//     await db.query('DELETE FROM users');

//     // Reset sequences
//     await db.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
//     await db.query('ALTER SEQUENCE categories_id_seq RESTART WITH 1');
//     await db.query('ALTER SEQUENCE books_id_seq RESTART WITH 1');
//     await db.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1');

//     console.log('✅ Cleared existing data');

//     // Seed users
//     const saltRounds = 10;
//     const defaultPassword = await bcrypt.hash('Password@123', saltRounds);

//     const users = [
//       {
//         name: 'Admin User',
//         email: 'admin@library.com',
//         password: defaultPassword,
//         role: 'librarian',
//       },
//       {
//         name: 'John Doe',
//         email: 'john@example.com',
//         password: defaultPassword,
//         role: 'user',
//       },
//       {
//         name: 'Jane Smith',
//         email: 'jane@example.com',
//         password: defaultPassword,
//         role: 'user',
//       },
//       {
//         name: 'Bob Johnson',
//         email: 'bob@example.com',
//         password: defaultPassword,
//         role: 'user',
//       },
//       {
//         name: 'Alice Brown',
//         email: 'alice@example.com',
//         password: defaultPassword,
//         role: 'user',
//       },
//     ];

//     for (const user of users) {
//       await db.query(
//         `INSERT INTO users (name, email, password, role) 
//          VALUES ($1, $2, $3, $4)`,
//         [user.name, user.email, user.password, user.role]
//       );
//     }
//     console.log('✅ Users seeded');

//     // Seed categories
//     const categories = [
//       { name: 'Technology', description: 'Books about technology and computing' },
//       { name: 'Science', description: 'Scientific books and publications' },
//       { name: 'Literature', description: 'Classic and modern literature' },
//       { name: 'History', description: 'Historical books and documents' },
//       { name: 'Mathematics', description: 'Mathematics and statistics' },
//       { name: 'Philosophy', description: 'Philosophical works and thinkers' },
//       { name: 'Arts', description: 'Books about arts and creativity' },
//       { name: 'Business', description: 'Business and management books' },
//     ];

//     for (const category of categories) {
//       await db.query(
//         `INSERT INTO categories (name, description) VALUES ($1, $2)`,
//         [category.name, category.description]
//       );
//     }
//     console.log('✅ Categories seeded');

//     // Seed books
//     const books = [
//       {
//         title: 'Clean Code',
//         author: 'Robert C. Martin',
//         isbn: '978-0132350884',
//         category_id: 1,
//         total_copies: 10,
//         description: 'A handbook of agile software craftsmanship',
//         publisher: 'Prentice Hall',
//         publication_year: 2008,
//       },
//       {
//         title: 'Design Patterns',
//         author: 'Gang of Four',
//         isbn: '978-0201633610',
//         category_id: 1,
//         total_copies: 8,
//         description: 'Elements of Reusable Object-Oriented Software',
//         publisher: 'Addison-Wesley',
//         publication_year: 1994,
//       },
//       {
//         title: 'Introduction to Algorithms',
//         author: 'Thomas H. Cormen',
//         isbn: '978-0262033848',
//         category_id: 1,
//         total_copies: 12,
//         description: 'Comprehensive introduction to algorithms',
//         publisher: 'MIT Press',
//         publication_year: 2009,
//       },
//       {
//         title: 'A Brief History of Time',
//         author: 'Stephen Hawking',
//         isbn: '978-0553380163',
//         category_id: 2,
//         total_copies: 15,
//         description: 'From the Big Bang to Black Holes',
//         publisher: 'Bantam',
//         publication_year: 1988,
//       },
//       {
//         title: 'The Selfish Gene',
//         author: 'Richard Dawkins',
//         isbn: '978-0199291151',
//         category_id: 2,
//         total_copies: 7,
//         description: 'A modern synthesis of evolutionary biology',
//         publisher: 'Oxford University Press',
//         publication_year: 1976,
//       },
//       {
//         title: 'To Kill a Mockingbird',
//         author: 'Harper Lee',
//         isbn: '978-0446310789',
//         category_id: 3,
//         total_copies: 20,
//         description: 'A classic of modern American literature',
//         publisher: 'Grand Central Publishing',
//         publication_year: 1960,
//       },
//       {
//         title: '1984',
//         author: 'George Orwell',
//         isbn: '978-0451524935',
//         category_id: 3,
//         total_copies: 18,
//         description: 'A dystopian social science fiction novel',
//         publisher: 'Signet Classic',
//         publication_year: 1949,
//       },
//       {
//         title: 'The Art of War',
//         author: 'Sun Tzu',
//         isbn: '978-1590302255',
//         category_id: 6,
//         total_copies: 9,
//         description: 'Ancient Chinese military treatise',
//         publisher: 'Shambhala',
//         publication_year: -500,
//       },
//       {
//         title: 'Thinking, Fast and Slow',
//         author: 'Daniel Kahneman',
//         isbn: '978-0374533557',
//         category_id: 6,
//         total_copies: 11,
//         description: 'An exploration of the mind and decision making',
//         publisher: 'Farrar, Straus and Giroux',
//         publication_year: 2011,
//       },
//       {
//         title: 'The Lean Startup',
//         author: 'Eric Ries',
//         isbn: '978-0307887894',
//         category_id: 8,
//         total_copies: 14,
//         description: 'How constant innovation creates successful businesses',
//         publisher: 'Crown Business',
//         publication_year: 2011,
//       },
//     ];

//     for (const book of books) {
//       await db.query(
//         `INSERT INTO books (title, author, isbn, category_id, total_copies, available_copies, description, publisher, publication_year)
//          VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)`,
//         [book.title, book.author, book.isbn, book.category_id, book.total_copies, book.description, book.publisher, book.publication_year]
//       );
//     }
//     console.log('✅ Books seeded');

//     // Seed bookings
//     const bookings = [
//       { user_id: 2, book_id: 1, issue_date: '2024-01-15', due_date: '2024-02-15', status: 'borrowed' },
//       { user_id: 2, book_id: 6, issue_date: '2024-02-01', due_date: '2024-03-01', status: 'borrowed' },
//       { user_id: 3, book_id: 4, issue_date: '2024-01-10', due_date: '2024-02-10', status: 'returned', return_date: '2024-02-08' },
//       { user_id: 3, book_id: 7, issue_date: '2024-02-15', due_date: '2024-03-15', status: 'borrowed' },
//       { user_id: 4, book_id: 10, issue_date: '2024-02-20', due_date: '2024-03-20', status: 'borrowed' },
//       { user_id: 5, book_id: 3, issue_date: '2024-01-05', due_date: '2024-02-05', status: 'returned', return_date: '2024-02-01' },
//       { user_id: 5, book_id: 8, issue_date: '2024-02-10', due_date: '2024-03-10', status: 'borrowed' },
//     ];

//     for (const booking of bookings) {
//       await db.query(
//         `INSERT INTO bookings (user_id, book_id, issue_date, due_date, return_date, status)
//          VALUES ($1, $2, $3, $4, $5, $6)`,
//         [booking.user_id, booking.book_id, booking.issue_date, booking.due_date, booking.return_date, booking.status]
//       );

//       // Update available copies for borrowed books
//       if (booking.status === 'borrowed') {
//         await db.query(
//           'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
//           [booking.book_id]
//         );
//       }
//     }
//     console.log('✅ Bookings seeded');

//     // Seed some security logs
//     const securityLogs = [
//       { user_id: 2, action: 'LOGIN', status: 'success', ip_address: '192.168.1.1' },
//       { user_id: 2, action: 'LOGIN', status: 'failed', ip_address: '192.168.1.1', details: { reason: 'Invalid password' } },
//       { user_id: 3, action: 'LOGIN', status: 'success', ip_address: '192.168.1.2' },
//       { user_id: 4, action: 'PASSWORD_RESET_REQUEST', status: 'success', ip_address: '192.168.1.3' },
//       { user_id: 5, action: 'LOGIN', status: 'success', ip_address: '192.168.1.4' },
//     ];

//     for (const log of securityLogs) {
//       await db.query(
//         `INSERT INTO security_logs (user_id, action, status, details, ip_address)
//          VALUES ($1, $2, $3, $4, $5)`,
//         [log.user_id, log.action, log.status, JSON.stringify(log.details || {}), log.ip_address]
//       );
//     }
//     console.log('✅ Security logs seeded');

//     // Seed reviews
//     const reviews = [
//       { user_id: 2, book_id: 1, rating: 5, comment: 'Excellent book for developers!', is_approved: true },
//       { user_id: 3, book_id: 4, rating: 4, comment: 'Very interesting read about the universe', is_approved: true },
//       { user_id: 5, book_id: 3, rating: 5, comment: 'A must-read for computer science students', is_approved: true },
//       { user_id: 2, book_id: 6, rating: 5, comment: 'A timeless classic', is_approved: true },
//       { user_id: 4, book_id: 10, rating: 4, comment: 'Great insights for entrepreneurs', is_approved: true },
//     ];

//     for (const review of reviews) {
//       await db.query(
//         `INSERT INTO reviews (user_id, book_id, rating, comment, is_approved)
//          VALUES ($1, $2, $3, $4, $5)`,
//         [review.user_id, review.book_id, review.rating, review.comment, review.is_approved]
//       );
//     }
//     console.log('✅ Reviews seeded');

//     console.log('🎉 Database seeding completed successfully!');
//     console.log('\n📝 Default login credentials:');
//     console.log('   Admin: admin@library.com / Password@123');
//     console.log('   User:  john@example.com / Password@123');
//     console.log('   User:  jane@example.com / Password@123');
//     console.log('   User:  bob@example.com / Password@123');
//     console.log('   User:  alice@example.com / Password@123');

//     process.exit(0);
//   } catch (error) {
//     console.error('❌ Seeding failed:', error);
//     process.exit(1);
//   }
// };

// // Run seeding
// seedDatabase();

require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await db.query('DELETE FROM security_logs');
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reviews');
    await db.query('DELETE FROM bookings');
    await db.query('DELETE FROM books');
    await db.query('DELETE FROM categories');
    await db.query('DELETE FROM users');
    console.log('✅ Existing data cleared\n');

    // Create users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    const users = [
      { name: 'Admin User', email: 'admin@library.com', role: 'librarian' },
      { name: 'John Doe', email: 'john@example.com', role: 'user' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
      { name: 'Bob Johnson', email: 'bob@example.com', role: 'user' },
      { name: 'Alice Brown', email: 'alice@example.com', role: 'user' },
    ];

    for (const user of users) {
      await db.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [user.name, user.email, hashedPassword, user.role]
      );
      console.log(`   ✅ Created: ${user.email} (${user.role})`);
    }

    // Create categories
    console.log('\nCreating categories...');
    const categories = [
      'Technology',
      'Science',
      'Literature',
      'History',
      'Mathematics',
      'Philosophy',
      'Arts',
      'Business',
    ];

    for (const cat of categories) {
      await db.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2)',
        [cat, `Books about ${cat.toLowerCase()}`]
      );
    }
    console.log(`   ✅ Created ${categories.length} categories`);

    // Create books
    console.log('\nCreating books...');
    const books = [
      { title: 'Clean Code', author: 'Robert C. Martin', category_id: 1, copies: 5 },
      { title: 'Design Patterns', author: 'Gang of Four', category_id: 1, copies: 3 },
      { title: 'A Brief History of Time', author: 'Stephen Hawking', category_id: 2, copies: 4 },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', category_id: 3, copies: 6 },
      { title: '1984', author: 'George Orwell', category_id: 3, copies: 5 },
      { title: 'The Art of War', author: 'Sun Tzu', category_id: 6, copies: 3 },
      { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category_id: 6, copies: 4 },
      { title: 'The Lean Startup', author: 'Eric Ries', category_id: 8, copies: 3 },
    ];

    for (const book of books) {
      await db.query(
        `INSERT INTO books (title, author, category_id, total_copies, available_copies)
         VALUES ($1, $2, $3, $4, $4)`,
        [book.title, book.author, book.category_id, book.copies]
      );
    }
    console.log(`   ✅ Created ${books.length} books`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@library.com / Password@123');
    console.log('   User:  john@example.com / Password@123');
    console.log('   User:  jane@example.com / Password@123');
    console.log('   User:  bob@example.com / Password@123');
    console.log('   User:  alice@example.com / Password@123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit();
}

seed();