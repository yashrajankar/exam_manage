// scripts/init-db.js
// Script to initialize the database with tables

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'tables.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
    
    // Get database connection
    const connection = await pool.getConnection();
    
    try {
      // Execute each statement
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement) {
          console.log('Executing:', trimmedStatement.substring(0, 50) + '...');
          await connection.execute(trimmedStatement);
        }
      }
      
      console.log('✅ Database initialized successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if script is called directly
if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = initDatabase;