require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  console.log('=== LOGIN DEBUG ===\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const testConn = await db.query('SELECT NOW()');
    console.log('   ✅ Database connected:', testConn.rows[0].now);
    
    // Check users table structure
    console.log('\n2. Checking users table structure...');
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check if users exist
    console.log('\n3. Checking existing users...');
    const users = await db.query('SELECT id, email, name, role, is_active FROM users');
    if (users.rows.length === 0) {
      console.log('   ❌ NO USERS FOUND! Database needs seeding.');
      console.log('   Run: npm run seed');
    } else {
      users.rows.forEach(user => {
        console.log(`   - ${user.email} | ${user.name} | ${user.role} | Active: ${user.is_active}`);
      });
    }
    
    // Test bcrypt
    console.log('\n4. Testing bcrypt...');
    const testPassword = 'Password@123';
    const hashed = await bcrypt.hash(testPassword, 10);
    const match = await bcrypt.compare(testPassword, hashed);
    console.log(`   ✅ bcrypt hashing and comparison: ${match ? 'WORKING' : 'FAILED'}`);
    
    // Test password comparison with stored hash
    console.log('\n5. Testing password comparison with stored hash...');
    const adminUser = await db.query("SELECT password FROM users WHERE email = 'admin@library.com'");
    if (adminUser.rows.length > 0) {
      const storedHash = adminUser.rows[0].password;
      const passwordMatch = await bcrypt.compare('Password@123', storedHash);
      console.log(`   ✅ Stored password match: ${passwordMatch}`);
      if (!passwordMatch) {
        console.log('   ⚠️ Password mismatch! The stored hash may be corrupted.');
        console.log('   Running: Re-seeding database...');
      }
    } else {
      console.log('   ❌ Admin user not found. Database needs seeding.');
    }
    
    // Check required environment variables
    console.log('\n6. Checking environment variables...');
    const requiredVars = ['JWT_SECRET', 'BCRYPT_SALT_ROUNDS', 'DATABASE_URL'];
    requiredVars.forEach(v => {
      console.log(`   ${process.env[v] ? '✅' : '❌'} ${v}: ${process.env[v] ? 'Set' : 'NOT SET'}`);
    });
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit();
}

debugLogin();