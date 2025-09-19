// Script to add email and phone columns to the staff table
const { pool } = require('../config/db');

async function addEmailPhoneColumns() {
  try {
    console.log('Connecting to database...');
    
    // Add email column if it doesn't exist
    try {
      await pool.execute('ALTER TABLE staff ADD COLUMN email VARCHAR(100)');
      console.log('Added email column to staff table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Email column already exists in staff table');
      } else {
        throw error;
      }
    }
    
    // Add phone column if it doesn't exist
    try {
      await pool.execute('ALTER TABLE staff ADD COLUMN phone VARCHAR(20)');
      console.log('Added phone column to staff table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Phone column already exists in staff table');
      } else {
        throw error;
      }
    }
    
    console.log('Successfully updated staff table structure');
  } catch (error) {
    console.error('Error updating staff table:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addEmailPhoneColumns();