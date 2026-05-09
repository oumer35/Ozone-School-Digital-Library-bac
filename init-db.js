require('dotenv').config();
const db = require('./config/db');

async function initDatabase() {
  console.log('🔧 Initializing database...');
  
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');
    
    // Create categories table
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table ready');
    
    // Create books table
    await db.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(20) UNIQUE,
        category_id INTEGER REFERENCES categories(id),
        total_copies INTEGER DEFAULT 1,
        available_copies INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Books table ready');
    
    // Create bookings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        book_id INTEGER REFERENCES books(id),
        issue_date DATE DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(50) DEFAULT 'borrowed',
        fine_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table ready');

    // Create security_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100),
        status VARCHAR(50),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Security logs table ready');

    // Create audit_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Audit logs table ready');

    // Check if admin user exists
    const adminExists = await db.query("SELECT id FROM users WHERE email = 'admin@library.com'");
    
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Admin User', 'admin@library.com', hashedPassword, 'librarian']
      );
      console.log('✅ Admin user created: admin@library.com / Password@123');
      
      // Create regular user
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['John Doe', 'john@example.com', hashedPassword, 'user']
      );
      console.log('✅ User created: john@example.com / Password@123');
    } else {
      console.log('✅ Users already exist');
    }

    // Add sample categories if none exist
    const catsExist = await db.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catsExist.rows[0].count) === 0) {
      const categories = ['Technology', 'Science', 'Literature', 'History'];
      for (const cat of categories) {
        await db.query('INSERT INTO categories (name) VALUES ($1)', [cat]);
      }
      console.log('✅ Sample categories created');
    }

    // Add sample books if none exist
    const booksExist = await db.query('SELECT COUNT(*) FROM books');
    if (parseInt(booksExist.rows[0].count) === 0) {
      const books = [
        ['Clean Code', 'Robert C. Martin', 1, 5],
        ['A Brief History of Time', 'Stephen Hawking', 2, 3],
        ['To Kill a Mockingbird', 'Harper Lee', 3, 4],
      ];
      for (const book of books) {
        await db.query(
          'INSERT INTO books (title, author, category_id, total_copies, available_copies) VALUES ($1,$2,$3,$4,$4)',
          book
        );
      }
      console.log('✅ Sample books created');
    }

    console.log('\n🎉 Database initialized successfully!');
    console.log('   Admin: admin@library.com / Password@123');
    console.log('   User:  john@example.com / Password@123');
    
  } catch (error) {
    console.error('❌ Database init failed:', error.message);
  }
  
  process.exit();
}

initDatabase();