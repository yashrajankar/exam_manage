// Script to run database migrations
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-unique-constraints.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
    
    // Get database connection
    const connection = await pool.getConnection();
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim() !== '') {
        try {
          await connection.execute(statement);
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          // Ignore duplicate key errors as they indicate the constraint already exists
          if (error.code !== 'ER_DUP_KEYNAME') {
            console.error(`✗ Error executing: ${statement.substring(0, 50)}...`, error.message);
            throw error;
          } else {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
          }
        }
      }
    }
    
    connection.release();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();