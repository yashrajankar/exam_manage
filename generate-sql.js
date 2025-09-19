// scripts/generate-sql.js
// Script to generate SQL commands for database setup

const fs = require('fs');
const path = require('path');

function generateSQL() {
  console.log('=== SQL Commands Generator ===\n');
  
  // Read configuration from .env
  const envPath = path.join(__dirname, '..', '.env');
  let envConfig = {};
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envConfig[key.trim()] = value.trim();
        }
      }
    });
  } catch (error) {
    console.error('❌ Could not read .env file:', error.message);
    process.exit(1);
  }
  
  const dbName = envConfig.DB_NAME || 'aicn_app_db';
  const dbUser = envConfig.DB_USER || 'aicn_user';
  const dbPassword = envConfig.DB_PASSWORD || 'SecurePass123!';
  
  console.log('Configuration from .env:');
  console.log(`  Database: ${dbName}`);
  console.log(`  User: ${dbUser}`);
  console.log(`  Password: ${dbPassword}`);
  console.log('');
  
  // Generate SQL commands
  const sqlCommands = `-- SQL Commands for Database Setup
-- Save this as setup.sql and run with: mysql -u root -p < setup.sql

-- Create database
CREATE DATABASE IF NOT EXISTS \`${dbName}\`;

-- Create user with localhost access
CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}';

-- Create user with remote access (optional)
CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';

-- Grant privileges for localhost access
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost';

-- Grant privileges for remote access
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify setup
SHOW DATABASES LIKE '${dbName}';
SELECT User, Host FROM mysql.user WHERE User = '${dbUser}';

-- End of setup
`;
  
  // Write to file
  const sqlFilePath = path.join(__dirname, '..', 'setup.sql');
  fs.writeFileSync(sqlFilePath, sqlCommands);
  
  console.log('✅ SQL commands generated and saved to setup.sql');
  console.log('\n📋 To set up the database:');
  console.log('1. Open a terminal/command prompt');
  console.log('2. Navigate to the project directory');
  console.log('3. Run: mysql -u root -p < setup.sql');
  console.log('   (Enter your MySQL root password when prompted)');
  console.log('\n📋 Alternatively, you can:');
  console.log('1. Connect to MySQL manually: mysql -u root -p');
  console.log('2. Copy and paste these commands:');
  console.log('\n' + sqlCommands);
  console.log('\n📋 After setup, test the connection:');
  console.log('1. Run: npm test');
  console.log('2. If successful, initialize tables: npm run db:init');
  console.log('3. Start the application: npm start');
}

// Run the generator if called directly
if (require.main === module) {
  generateSQL();
}