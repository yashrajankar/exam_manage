// scripts/monitor-database.js
// Script to monitor database connection status

const { pool } = require('../config/db');

async function monitorDatabase() {
  try {
    console.log('Checking database connection status...');
    
    // Get a connection from the pool
    const connection = await pool.getConnection();
    
    // Test the connection
    await connection.ping();
    
    // Get database information
    const [dbRows] = await connection.execute('SELECT DATABASE() as databaseName');
    const databaseName = dbRows[0].databaseName;
    
    // Get table information
    const [tables] = await connection.execute('SHOW TABLES');
    
    console.log('✅ Database Connection: OK');
    console.log(`📊 Database Name: ${databaseName}`);
    console.log(`📋 Number of Tables: ${tables.length}`);
    
    if (tables.length > 0) {
      console.log('📄 Tables:');
      for (let i = 0; i < Math.min(tables.length, 10); i++) {
        const tableName = Object.values(tables[i])[0];
        try {
          const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`   - ${tableName}: ${countRows[0].count} records`);
        } catch (error) {
          console.log(`   - ${tableName}: Unable to count records`);
        }
      }
      if (tables.length > 10) {
        console.log(`   ... and ${tables.length - 10} more tables`);
      }
    }
    
    // Release the connection
    connection.release();
    
    return {
      status: 'connected',
      database: databaseName,
      tables: tables.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Database Connection: FAILED');
    console.error('Error:', error.message);
    
    return {
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  monitorDatabase().then((result) => {
    process.exit(result.status === 'connected' ? 0 : 1);
  });
}

module.exports = monitorDatabase;