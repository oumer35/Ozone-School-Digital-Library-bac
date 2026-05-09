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

const { Pool } = require('pg');
require('dotenv').config();

// Render provides DATABASE_URL as an INTERNAL connection string
// This is different from the External Database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render's PostgreSQL
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};