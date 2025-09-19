// config/db.js
// Basic MySQL connection pool setup

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'your_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Add a testConnection function for health checks
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    return false;
  }
};

module.exports = { pool, testConnection };