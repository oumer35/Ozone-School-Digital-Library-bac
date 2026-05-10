// const { Pool } = require('pg');
// require('dotenv').config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

// pool.on('error', (err) => {
//   console.error('Unexpected error on idle client', err);
//   process.exit(-1);
// });

// pool.on('connect', () => {
//   console.log('Database connected successfully');
// });

// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool: pool,
// };

// const { Pool } = require('pg');
// require('dotenv').config();

// // Render provides DATABASE_URL as an INTERNAL connection string
// // This is different from the External Database URL
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // Required for Render's PostgreSQL
//   },
//   max: 10,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
// });

// pool.on('error', (err) => {
//   console.error('❌ Database pool error:', err.message);
// });

// pool.on('connect', () => {
//   console.log('✅ Database connected successfully');
// });

// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool: pool,
// };

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Database Configuration
 * Automatically adapts between local development and production (Render)
 * 
 * LOCAL: SSL disabled - your local PostgreSQL doesn't need SSL
 * RENDER: SSL enabled with rejectUnauthorized: false - required for Render's PostgreSQL
 */

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || 
                 (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com'));
const useSSL = isProduction || isRender;

// Log the environment
console.log('='.repeat(50));
console.log('🔧 DATABASE CONFIGURATION');
console.log('='.repeat(50));
console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`   Platform:    ${isRender ? 'Render' : 'Local'}`);
console.log(`   SSL:         ${useSSL ? 'ENABLED' : 'DISABLED'}`);
if (process.env.DATABASE_URL) {
  // Hide password in log
  const urlParts = process.env.DATABASE_URL.replace(/\/\/(.*):(.*)@/, '//***:***@');
  console.log(`   Database:    ${urlParts.split('/').pop()}`);
}
console.log('='.repeat(50));

// Build pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/library_ozone',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// SSL Configuration
// Only used for Render's PostgreSQL in production
if (useSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required by Render's PostgreSQL
    // Note: For production with proper certificates, you'd use:
    // rejectUnauthorized: true,
    // ca: process.env.DB_CA_CERT,
  };
  console.log('   SSL Mode:    Enabled (rejectUnauthorized: false)');
} else {
  console.log('   SSL Mode:    Disabled (local PostgreSQL)');
}

// Create the pool
const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  
  if (err.message.includes('SSL')) {
    console.error('\n💡 SSL CONNECTION ISSUE DETECTED:');
    console.error('   If you are running LOCALLY, your PostgreSQL doesn\'t support SSL.');
    console.error('   The connection should automatically work without SSL.');
    console.error('   Make sure NODE_ENV is NOT set to "production" in your .env file.\n');
  }
  
  if (err.message.includes('ECONNREFUSED')) {
    console.error('\n💡 CONNECTION REFUSED:');
    console.error('   Make sure PostgreSQL is running on your machine.');
    console.error('   Check if the DATABASE_URL in your .env file is correct.\n');
  }
});

pool.on('remove', () => {
  console.log('🔌 Database connection removed from pool');
});

// Test connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`✅ Database ready: ${result.rows[0].db_name} at ${result.rows[0].current_time}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    
    if (!useSSL && error.message.includes('SSL')) {
      console.error('\n⚠️ SSL ERROR ON LOCAL DATABASE:');
      console.error('   Your local PostgreSQL rejected the SSL connection.');
      console.error('   SSL has been automatically disabled for local development.');
      console.error('   If the problem persists, check your PostgreSQL configuration.\n');
    }
    
    return false;
  }
}

// Run connection test
testConnection();

// Export query helper and pool
module.exports = {
  query: (text, params) => {
    const start = Date.now();
    return pool.query(text, params).then(result => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.log(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
      }
      return result;
    });
  },
  pool: pool,
  testConnection: testConnection,
};