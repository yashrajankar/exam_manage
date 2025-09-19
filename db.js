// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'aicn_user',
  password: process.env.DB_PASSWORD || 'SecurePass123!',
  database: process.env.DB_NAME || 'aicn_app_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Remove invalid configuration options
  connectTimeout: 30000 // 30 seconds
  // Removed acquireTimeout and timeout as they are invalid options
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection with enhanced error handling
async function testConnection() {
  try {
    // Test basic connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    
    // Test a simple query to ensure the connection is fully functional
    await connection.execute('SELECT 1');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error.message);
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Check if MySQL server is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Access denied. Check username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  → Database does not exist. Check database name.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  → Host not found. Check database host.');
    } else if (error.errno === 'ETIMEDOUT') {
      console.error('  → Connection timed out. Check network connectivity.');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('  → DNS resolution failed. Check database host configuration.');
    }
    
    return false;
  }
}

// Enhanced connection health check with timeout
async function checkConnectionHealth() {
  try {
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection health check timed out')), 5000);
    });
    
    const healthCheckPromise = (async () => {
      const connection = await pool.getConnection();
      const [result] = await connection.execute('SELECT 1 as connected');
      connection.release();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        result: result[0].connected
      };
    })();
    
    return await Promise.race([healthCheckPromise, timeoutPromise]);
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Add a function to get connection pool statistics
function getPoolStats() {
  // Check if pool has the expected properties
  if (pool && typeof pool === 'object') {
    return {
      totalConnections: pool._allConnections ? pool._allConnections.length : 0,
      freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
      usedConnections: pool._allConnections && pool._freeConnections ? 
        pool._allConnections.length - pool._freeConnections.length : 0
    };
  }
  
  // Return default values if pool is not properly initialized
  return {
    totalConnections: 0,
    freeConnections: 0,
    usedConnections: 0
  };
}

module.exports = {
  pool,
  testConnection,
  checkConnectionHealth,
  getPoolStats
};