const db = require('./config/db');

async function checkDatabase() {
  try {
    console.log('Checking database structure...\n');
    
    // Check users table
    const usersColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('✅ Users table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check if any users exist
    const users = await db.query('SELECT id, email, role FROM users LIMIT 5');
    console.log('\n✅ Existing users:');
    users.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    if (users.rows.length === 0) {
      console.log('   ⚠️ No users found! Run: npm run seed');
    }

    // Test password comparison
    const bcrypt = require('bcryptjs');
    const testHash = await bcrypt.hash('Password@123', 10);
    const isValid = await bcrypt.compare('Password@123', testHash);
    console.log(`\n✅ bcrypt working: ${isValid}`);

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

checkDatabase();