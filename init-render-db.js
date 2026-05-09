// Point to your Render database
process.env.DATABASE_URL = 'postgresql://library_ozone_user:OAR1zutgo8L1hNOoPIqMG5oENoxIcuUZ@dpg-d7vrr25b910c73da6s1g-a.frankfurt-postgres.render.com/library_ozone';

const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function initRenderDatabase() {
  console.log('🔧 Connecting to Render database...\n');

  try {
    // Test connection
    const test = await db.query('SELECT NOW()');
    console.log('✅ Connected to Render database:', test.rows[0].now);

    // ==================== CREATE ALL TABLES ====================
    console.log('\n📋 Creating tables...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        phone VARCHAR(20),
        avatar_url TEXT,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        otp_code VARCHAR(6),
        otp_expiry TIMESTAMP,
        refresh_token TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ users');

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
    console.log('   ✅ categories');

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
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ books');

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
    console.log('   ✅ bookings');

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
    console.log('   ✅ security_logs');

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
    console.log('   ✅ audit_logs');

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
    console.log('   ✅ reviews');

    // ==================== CHECK & CREATE USERS ====================
    console.log('\n👤 Checking users...');
    const existingUsers = await db.query("SELECT COUNT(*) as count FROM users");
    
    if (parseInt(existingUsers.rows[0].count) === 0) {
      console.log('   Creating users...');
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Admin User', 'admin@library.com', hashedPassword, 'librarian']
      );
      console.log('   ✅ admin@library.com (librarian)');

      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['John Doe', 'john@example.com', hashedPassword, 'user']
      );
      console.log('   ✅ john@example.com (user)');
    } else {
      console.log('   ✅ Users already exist');
    }

    // ==================== CREATE CATEGORIES ====================
    console.log('\n📚 Checking categories...');
    const existingCats = await db.query("SELECT COUNT(*) as count FROM categories");
    
    if (parseInt(existingCats.rows[0].count) === 0) {
      console.log('   Creating categories...');
      const categories = ['Technology', 'Science', 'Literature', 'History'];
      for (const cat of categories) {
        await db.query(
          "INSERT INTO categories (name, description) VALUES ($1, $2)",
          [cat, `Books about ${cat.toLowerCase()}`]
        );
        console.log(`   ✅ ${cat}`);
      }
    } else {
      console.log('   ✅ Categories already exist');
    }

    // ==================== CREATE BOOKS ====================
    console.log('\n📖 Checking books...');
    const existingBooks = await db.query("SELECT COUNT(*) as count FROM books");
    
    if (parseInt(existingBooks.rows[0].count) === 0) {
      console.log('   Creating books...');
      
      // Get category IDs
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
          console.log(`   ✅ ${book.title}`);
        }
      }
    } else {
      console.log('   ✅ Books already exist');
    }

    console.log('\n🎉 Render database initialized successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@library.com / Password@123');
    console.log('   User:  john@example.com / Password@123');
    console.log('\n✅ Your backend should now work! Try logging in at:');
    console.log('   https://ozone-school-digital-library.vercel.app/login');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error('Full error:', error);
  }

  process.exit();
}

initRenderDatabase();