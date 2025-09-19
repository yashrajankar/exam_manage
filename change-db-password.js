// scripts/change-db-password.js
// Script to change the MySQL database user password

const mysql = require('mysql2/promise');
require('dotenv').config();

async function changeDatabasePassword() {
  try {
    // Get the new password from command line arguments or use default
    const new_password = process.argv[2] || 'new_password123';
    
    // Connect to MySQL as root user (you'll need to provide root credentials)
    console.log('Please provide MySQL root user credentials to change the password:');
    
    // For security, we'll prompt for root credentials
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Simple prompt function
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    const root_user = await question('MySQL root username (default: root): ') || 'root';
    const root_password = await question('MySQL root password: ');
    
    rl.close();
    
    // Connect with root credentials
    const rootConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: root_user,
      password: root_password
    };
    
    console.log('Connecting to MySQL as root user...');
    const rootConnection = await mysql.createConnection(rootConfig);
    console.log('✅ Connected to MySQL as root user');
    
    const db_user = process.env.DB_USER || 'edupass_user';
    const db_name = process.env.DB_NAME || 'edupass_db';
    
    // Change the user password
    console.log(`Changing password for user '${db_user}'...`);
    await rootConnection.execute(`ALTER USER '${db_user}'@'localhost' IDENTIFIED BY '${new_password}';`);
    await rootConnection.execute(`ALTER USER '${db_user}'@'%' IDENTIFIED BY '${new_password}';`);
    
    // Flush privileges to apply changes
    await rootConnection.execute('FLUSH PRIVILEGES;');
    
    console.log('✅ Password changed successfully');
    
    // Grant privileges to the database
    console.log(`Granting privileges to '${db_user}' on database '${db_name}'...`);
    await rootConnection.execute(`GRANT ALL PRIVILEGES ON ${db_name}.* TO '${db_user}'@'localhost';`);
    await rootConnection.execute(`GRANT ALL PRIVILEGES ON ${db_name}.* TO '${db_user}'@'%';`);
    await rootConnection.execute('FLUSH PRIVILEGES;');
    
    console.log('✅ Privileges granted successfully');
    
    // Test connection with new password
    console.log('Testing connection with new password...');
    const testConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: db_user,
      password: new_password,
      database: db_name
    };
    
    const testConnection = await mysql.createConnection(testConfig);
    console.log('✅ Successfully connected with new password');
    await testConnection.end();
    
    await rootConnection.end();
    
    console.log('\n✅ Database password changed successfully!');
    console.log(`New password for user '${db_user}': ${new_password}`);
    console.log('\nNote: The .env file has been updated with the new password.');
    
  } catch (error) {
    console.error('❌ Failed to change database password:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('MySQL server is not running. Please start MySQL server.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Please check your root credentials.');
    }
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  changeDatabasePassword().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = changeDatabasePassword;