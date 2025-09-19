// scripts/create-db.js
// Script to create database and user for AICN application

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabaseAndUser() {
  const rootPassword = process.argv[2] || '';

  try {
    // Try connecting as root user (first without password, then with provided password)
    const rootConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 33060,
      user: 'root',
      password: rootPassword,
      // Add compatibility flags for version mismatch
      ssl: false,
      authPlugins: {
        mysql_native_password: () => () => Buffer.from([])
      }
    };

    console.log('Connecting to MySQL as root...');
    const connection = await mysql.createConnection(rootConfig);
    console.log('✅ Connected to MySQL as root');

    // Create database
    const dbName = process.env.DB_NAME || 'aicn_app_db';
    console.log(`Creating database '${dbName}'...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);

    // Create user
    const dbUser = process.env.DB_USER || 'aicn_user';
    const dbPassword = process.env.DB_PASSWORD || 'SecurePass123!';
    console.log(`Creating user '${dbUser}'...`);
    try {
      await connection.execute(`CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'`);
      console.log(`✅ User '${dbUser}' created or already exists`);
    } catch (error) {
      if (error.code === 'ER_CANNOT_USER') {
        // User might already exist, try to set password
        try {
          await connection.execute(`ALTER USER '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'`);
          console.log(`✅ Password updated for user '${dbUser}'`);
        } catch (alterError) {
          console.log(`ℹ️  Could not create or update user: ${alterError.message}`);
        }
      } else {
        throw error;
      }
    }

    // Grant privileges
    console.log(`Granting privileges to user '${dbUser}'...`);
    await connection.execute(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost'`);
    console.log(`✅ Privileges granted to user '${dbUser}'`);

    // Apply changes
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ Privileges flushed');

    // Verify setup
    console.log('Verifying setup...');
    const [dbRows] = await connection.execute(
      'SHOW DATABASES LIKE ?',
      [dbName]
    );
    console.log(`Database check: ${dbRows.length > 0 ? '✅ Found' : '❌ Not found'}`);

    const [userRows] = await connection.execute(
      "SELECT User, Host FROM mysql.user WHERE User = ?",
      [dbUser]
    );
    console.log(`User check: ${userRows.length > 0 ? '✅ Found' : '❌ Not found'}`);

    await connection.end();
    console.log('✅ Database and user setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    console.error('Error syscall:', error.syscall);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Please check your MySQL root password.');
      console.log('Usage: node scripts/create-db.js <root_password>');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. MySQL server may not be running.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Host not found. Please check your database host configuration.');
    } else if (error.code === 'HANDSHAKE_IN_PROGRESS') {
      console.error('Protocol mismatch. There might be a version incompatibility between client and server.');
    }
    process.exit(1);
  }
}

// Run the setup if script is called directly
if (require.main === module) {
  createDatabaseAndUser();
}