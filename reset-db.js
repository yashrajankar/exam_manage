// scripts/reset-db.js
// Script to reset the existing database by dropping and recreating all tables

const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
    
    try {
      // Execute each statement
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement) {
          console.log('Executing:', trimmedStatement.substring(0, 50) + '...');
          await pool.execute(trimmedStatement);
        }
      }
      
      console.log('✅ Database reset successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Run: npm start (to start the application with the fresh database)');
      
    } catch (error) {
      console.error('❌ Error executing schema statements:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the reset if script is called directly
if (require.main === module) {
  resetDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  });
}

module.exports = resetDatabase;