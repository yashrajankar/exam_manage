// scripts/create-missing-tables.js
// Script to create any missing tables

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createMissingTables() {
  try {
    console.log('Creating missing tables...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'aicn_user',
      password: process.env.DB_PASSWORD || 'SecurePass123!',
      database: process.env.DB_NAME || 'aicn_app_db',
      ssl: false
    });

    // Create staff_allocations table
    const createStaffAllocationsTable = `
      CREATE TABLE IF NOT EXISTS staff_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        allocationData JSON NOT NULL,
        date DATE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_allocation_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createStaffAllocationsTable);
    console.log('✅ Created staff_allocations table');
    
    await connection.end();
    console.log('✅ All missing tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create missing tables:', error.message);
    console.error('Error code:', error.code);
  }
}

createMissingTables();